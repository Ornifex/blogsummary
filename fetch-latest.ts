/* eslint-disable @typescript-eslint/no-explicit-any */
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
const OUTPUT_FILE = "./src/public/data/summaries.json";

console.log("Loaded API Key:", process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });

async function fetchBlogList() {
  const res = await axios.get(BLOG_LIST_URL);
  const $ = cheerio.load(res.data);

  const posts = $(".List-item").map((_, el) => {
    const title = $(el).find(".NewsBlog-title").text().trim();
    const relativeLink = $(el).find(".NewsBlog-link").attr("href");
    const url = `${BASE_URL}${relativeLink}`;
    const id = relativeLink?.split("/").pop();

    return { id, title, url };
  }).get();

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

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 3000,
  });

  console.log(`Fetching content from: ${url}`);
  const result = await page.evaluate(() => {
    const text = document.querySelector(".detail")?.textContent?.trim() || "";
    const date = document.querySelector(".LocalizedDateMount time")?.getAttribute("datetime") || "";
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
  type?: "class" | "contentType"
): Promise<string> {
  let prompt: string;

  if (!preference || !type) {
    // 🟢 GENERAL SUMMARY MODE
    prompt = `
      Summarize the following World of Warcraft blog post in strictly under 100 words.
      Focus on content relevant to *Retail WoW only* — The War Within and later.
      Do not include Classic, Wrath, Season of Discovery, Season of Mastery, Mists of Pandaria, Cataclysm, or other non-Retail versions.
      Use clean, minimal HTML (not markdown). Line breaks are allowed. Be clear, concise, and readable.

      """
      ${text}
      """`;
  } else {
    // 🔵 HYPERFOCUSED SUMMARY MODE
    const baseInstruction = `Summarize the following blog post in **approximately 150 words**, but only if the content merits it. 
     Feel free to exceed 150 words, if absolutely necessary to capture all relevant info.
     Be concise and avoid filler. 
     If relevant content is sparse, fewer words are preferred.
     Focus on content relevant to *Retail WoW only* — The War Within and later.
     Do not include Classic, Wrath, Season of Discovery, Season of Mastery, Mists of Pandaria, Cataclysm, or other non-Retail versions.
     Focusing *only* on content relevant to the selected ${type === "class" ? "class" : "content type"}: "${preference}".`;

    const relevanceFilter = `Ignore all unrelated or general-purpose information already likely covered in the main summary. 
     Exclude information that applies equally to all players.
     Do not include background context, unrelated events, or other classes/content types.
     Ensure all points are consistent with each other and with the source text.
     Focus solely on the specific ${type === "class" ? "class" : "content type"}: "${preference}".
     Do not include Classic, Wrath, Season of Discovery, Season of Mastery, Mists of Pandaria, Cataclysm, or other non-Retail versions.
     Do not include vague statements or generic marketing language (e.g. “players will enjoy exciting adventures”). Focus only on concrete details explicitly stated in the text.
     M+ pertains to specifically Mythic+ dungeons, not raid content. Raid content excludes M+ dungeons. 
     Open World content is not M+ or Raiding, it refers specifically to outdoor content like world quests, events, and exploration.`;

    const duplicationWarning = `Assume the user has read the general summary. Do not repeat or paraphrase it.`;

    const formatting = `Output in clean, minimal HTML. Use simple HTML tags such as <strong>, <em>, <ul>, <li>, and <br> only when they improve readability. Avoid tables or excessive formatting. 
     Use readable, concise, and structured phrasing. Do not use markdown. Only return the raw summary content, which can be formatted for clarity, prefer clarity in formatting, like lists, and linebreaks, where it makes sense. 
     Do not prepend or append any explanation, greeting, or framing text. This includes most importantly, do not include the words "Summary" or "Summarize" in the output.
     Do not include any additional context, disclaimers, or explanations. The summary should be ready to be displayed directly to the user without any additional framing or context.
     `;

    const fallback = `If the blog post contains no content relevant to "${preference}", return exactly: "Please refer to the general summary."`;

    prompt = `
      ${baseInstruction}
      ${relevanceFilter}
      ${duplicationWarning}
      ${formatting}
      ${fallback}

      """
      ${text}
      """`;
        }

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (err: any) {
    console.error("Gemini API error:", err?.response?.status, err?.response?.data ?? err);
    return "[SUMMARY_FAILED]";
  }
}


async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

async function main() {
  const summaries = loadExistingSummaries();
  const existingIds = new Set(summaries.map(e => e.id));

  const newPosts = await fetchBlogList();

  for (const post of newPosts) {
    if (!post.id || existingIds.has(post.id)) {
      console.log(`Skipping existing post: ${post.title}`);
      continue;
    }

    console.log(`Fetching and summarizing: ${post.title}`);
    const { text: articleText, date } = await fetchArticleContent(post.url);
    console.log(`Fetched article text for: ${post.title}`);

    const summary = await summarize(articleText);
    
    console.log("hmm");

    const originalWordCount = countWords(articleText);
    const summaryWordCount = countWords(summary);
    const reduction = ((1 - summaryWordCount / originalWordCount) * 100).toFixed(1);
    console.log(`Original word count: ${originalWordCount}, Summary word count: ${summaryWordCount}, Reduction: ${reduction}%`);

    const classSummaries: Record<string, { summary: string; word_stats: { original: number; summary: number; reduction_percent: number } }> = {};
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
          reduction_percent: parseFloat(((1 - classSummaryWordCount / originalWordCount) * 100).toFixed(1)),
        },
      };
    }

    const contentTypeSummaries: Record<string, { summary: string; word_stats: { original: number; summary: number; reduction_percent: number } }> = {};
    for (const contentType of CONTENT_TYPES) {
      console.log(`Summarizing for content type: ${contentType}`);
      const ctSummary = await summarize(articleText, contentType, "contentType");
      await delay(5000);
      const ctSummaryWordCount = countWords(ctSummary);
      contentTypeSummaries[contentType] = {
        summary: ctSummary,
        word_stats: {
          original: originalWordCount,
          summary: ctSummaryWordCount,
          reduction_percent: parseFloat(((1 - ctSummaryWordCount / originalWordCount) * 100).toFixed(1)),
        },
      };
    }

    const newSummary = {
      id: post.id,
      title: post.title,
      date: date.split("T")[0],
      original_url: post.url,
      summary,
      word_stats: {
        original: originalWordCount,
        summary: summaryWordCount,
        reduction_percent: parseFloat(reduction),
      },
      classSummaries,
      contentTypeSummaries,
    };

    summaries.push(newSummary);
    existingIds.add(post.id);

    writeFileSync(OUTPUT_FILE, JSON.stringify(summaries, null, 2));
    console.log(`Saved summary for: ${post.title}`);

    await delay(5000);
  }

  console.log(`Processing complete. Total summaries: ${summaries.length}`);
}

main().catch(console.error);
