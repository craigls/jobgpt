# JobGPT (Beta)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenAI](https://img.shields.io/badge/OpenAI-Required-blue.svg)](https://platform.openai.com/)

## Description

JobGPT is a Chrome extension that helps software engineers streamline their job search.
Enter a company name and/or job title, and tailored insights will be provided, including:

- Salary ranges
- Interview process
- Company culture
- Tech stack
- Cover letter ideas

JobGPT uses OpenAI's `gpt-4o-mini-search-preview` model. This model is able to make web search calls, so keep an eye on your token usage.

## Installation

> This extension is not published on the Chrome Web Store, so it must be installed manually.

### Manual Install

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** via the toggle in the top-right corner
3. Click **Load unpacked**
4. Browse to the folder containing this extension's `src` directory and load it

### Add Your OpenAI API Key

1. Go to **Extensions > JobGPT > Set API Key**
2. Enter your OpenAI API key and save it
3. Start researching companies!

## Supporting Libraries

- **[marked](https://github.com/markedjs/marked)** - Rendering Markdown as HTML
- **[pico](https://github.com/picocss/pico)** - Lightweight CSS framework
