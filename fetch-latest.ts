/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
// fetch-latest.ts
import dotenv from "dotenv";
dotenv.config();
import type { BlogSummary } from "./src/types";
import axios from "axios";
import * as cheerio from "cheerio";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer";
import { CLASSES, CONTENT_TYPES } from "./src/types";

const BASE_URL = "https://worldofwarcraft.blizzard.com";
const BLOG_LIST_URL = `${BASE_URL}/en-us/search/blog?a=Blizzard%20Entertainment`;
const OUTPUT_FILE = "./public/data/summaries.json";

console.log("Loaded API Key:", process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite-preview-06-17",
  generationConfig: {
    temperature: 0.1,
  },
});

async function fetchBlogList() {
  const res = await axios.get(BLOG_LIST_URL);
  const $ = cheerio.load(res.data);

  const posts = $(".List-item")
    .map((_, el) => {
      const title = $(el).find(".NewsBlog-title").text().trim();
      const relativeLink = $(el).find(".NewsBlog-link").attr("href");
      const url = `${BASE_URL}${relativeLink}`;
      const id = relativeLink?.split("/").pop();

      return { id, title, url };
    })
    .get();

  return posts;
}

function loadExistingSummaries(): BlogSummary[] {
  if (!existsSync(OUTPUT_FILE)) return [];
  return JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
}

async function fetchArticleContent(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  console.log("Launching browser to fetch article content...");
  const page = await browser.newPage();
  console.log("Setting user agent and viewport...");

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  );
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 3000,
  });

  console.log(`Fetching content from: ${url}`);
  const result = await page.evaluate(() => {
    const text = document.querySelector(".detail")?.textContent?.trim() || "";
    const date =
      document
        .querySelector(".LocalizedDateMount time")
        ?.getAttribute("datetime") || "";
    return { text, date };
  });
  console.log("Content fetched successfully.");
  browser.close();
  console.log("Browser closed.");
  return result;
}

async function summarize(
  text: string,
  preference?: string,
  type?: "class" | "contentType",
): Promise<string> {
  let prompt: string;

  if (!preference || !type) {
    // 🟢 GENERAL SUMMARY MODE
    prompt = `
      You are an expert summarizer for World of Warcraft blog posts, focusing on the current retail version, The War Within and later.
      Your task is to create a concise, clear summary of the provided blog post content. Do not preface your response with any framing text.
      Focus on the most relevant and important details, avoiding filler or unnecessary information.
      Summarize the following World of Warcraft blog post in strictly under 100 words.
      Focus on content relevant to *Retail WoW only* — current retail is The War Within and later. Next expansion is called Midnight. Current expansion is The War Within.
      Do not include Classic or Wrath of the Lich King or Season of Discovery or Season of Mastery or Mists of Pandaria or Cataclysm or other non-Retail versions.
      Use clean, minimal HTML (not markdown). Line breaks are allowed. Be clear, concise, and readable.
      Always begin with a single <strong>highlight sentence</strong>, followed by a <ul> of 3–5 key points, enclosed by <li> tags, each item starting an arrow.


      """
      ${text}
      """`;
  } else {
    // 🔵 HYPERFOCUSED SUMMARY MODE
    prompt = `
        You are an expert summarizer for World of Warcraft blog posts. Focus exclusively on the current Retail WoW version — The War Within and future expansions, which are Midnight and The Last Titan.

        Your task is to generate a concise, topic-specific summary based on the following blog post. 
        Focus *only* on content explicitly relevant to the ${type === "class" ? "class" : "content type"}: "${preference}".

        Do **not** include:
        - General-purpose information already likely covered in the main summary. This includes game wide events.
        - Background context, unrelated events, or content about other classes/content types.
        - Any reference to non-Retail WoW versions (Classic, Wrath, Cataclysm, Mists, SoD, SoM, etc.).
        - Vague, filler, or promotional language (e.g., “exciting adventures”, “players can look forward to…”).
        - Explanatory text, introductions, disclaimers, or the word "Summary".

        If "${type} ${preference}" is not meaningfully discussed, return exactly:
        "Please refer to the general summary."

        Content Type Definitions:
        - “Mythic+” refers only to Mythic+ dungeon content — not raids.
        - “Raids” exclude Mythic+.
        - “Open World” refers to outdoor content (world quests, events, exploration, the trading post), excluding M+ and Raids.
        - “PvP” refers to player-vs-player content (battlegrounds, arenas, world PvP), excluding M+ and Raids.
        - “Classes” refers to the specific class mentioned, specifically class changes, tuning, talent changes, tier set changes, bugfixes, not general class information. When prompted with a class name, do not include any Raid, Mythic+, PvP, or Open World content, regardless of how relevant it may seem.
        

         Summary instructions:
        - Aim for ~150 words, but fewer if the relevant content is sparse. More is acceptable only if needed.
        - Use clean, minimal HTML only.
        - Do not use markdown formatting.
        - Use clear, concise language.
        - Allow these tags only: <strong>, <em>, <ul>, <li>, <br>. Use lists and line breaks to improve clarity.
        - Return **only** the raw summary. No headers, greetings, or framing.
        - Always begin with a single <strong>highlight sentence</strong>, followed by a <ul> of 3–5 key points, enclosed by <li> tags, each item starting an arrow.

        """
        ${text}
        """
        `;
  }

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (err: any) {
    console.error(
      "Gemini API error:",
      err?.response?.status,
      err?.response?.data ?? err,
    );
    return "[SUMMARY_FAILED]";
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

async function main() {
  const summaries = loadExistingSummaries();
  const existingIds = new Set(summaries.map((e) => e.id));

  const newPosts = await fetchBlogList();

  for (const post of newPosts) {
    if (!post.id || existingIds.has(post.id)) {
      console.log(`Skipping existing post: ${post.title}`);
      continue;
    }

    console.log(`Fetching and summarizing: ${post.title}`);
    const { text: articleText, date } = await fetchArticleContent(post.url);
    console.log(`Fetched article text for: ${post.title}`);

    const generalSummary = await summarize(articleText);
    const originalWordCount = countWords(articleText);
    const generalSummaryWordCount = countWords(generalSummary);
    const generalReduction = parseFloat(
      ((1 - generalSummaryWordCount / originalWordCount) * 100).toFixed(1),
    );

    const classSummaries: BlogSummary["summaries"] = {};
    for (const className of CLASSES) {
      console.log(`Summarizing for class: ${className}`);
      const classSummary = await summarize(articleText, className, "class");
      await delay(5000);
      const classSummaryWordCount = countWords(classSummary);
      classSummaries[className] = {
        summary: classSummary,
        word_stats: {
          original: originalWordCount,
          summary: classSummaryWordCount,
          reduction_percent: parseFloat(
            ((1 - classSummaryWordCount / originalWordCount) * 100).toFixed(1),
          ),
        },
      };
    }

    for (const contentType of CONTENT_TYPES) {
      console.log(`Summarizing for content type: ${contentType}`);
      const ctSummary = await summarize(
        articleText,
        contentType,
        "contentType",
      );
      await delay(5000);
      const ctSummaryWordCount = countWords(ctSummary);
      classSummaries[contentType] = {
        summary: ctSummary,
        word_stats: {
          original: originalWordCount,
          summary: ctSummaryWordCount,
          reduction_percent: parseFloat(
            ((1 - ctSummaryWordCount / originalWordCount) * 100).toFixed(1),
          ),
        },
      };
    }

    classSummaries["General"] = {
      summary: generalSummary,
      word_stats: {
        original: originalWordCount,
        summary: generalSummaryWordCount,
        reduction_percent: generalReduction,
      },
    };

    const newSummary: BlogSummary = {
      id: post.id,
      title: post.title,
      date: date.split("T")[0],
      original_url: post.url,
      summaries: classSummaries,
    };

    summaries.push(newSummary);
    existingIds.add(post.id);

    if (!existsSync(OUTPUT_FILE)) {
      writeFileSync(OUTPUT_FILE, "[]");
    }
    writeFileSync(OUTPUT_FILE, JSON.stringify(summaries, null, 2));
    console.log(`Saved summary for: ${post.title}`);

    await delay(5000);
  }

  console.log(`Processing complete. Total summaries: ${summaries.length}`);
}

main().catch(console.error);
