export class Researcher {
  static llmApiEndpointUrl = "https://api.openai.com/v1/responses";
  static llmApiModelName = "gpt-5-nano";
  static llmApiParams = {
    tools: [{ type: "web_search", search_context_size: "low" }],
    tool_choice: "auto",
    reasoning: { effort: "low" },
    text: { verbosity: "low" },
  };

  researchCompany(apiKey, searchString) {
    console.info("Researching company:", searchString);
    const requestParams = {
      model: Researcher.llmApiModelName,
      input: this.createPrompts(searchString),
      ...Researcher.llmApiParams,
    };
    const controller = new AbortController(),
      promise = fetch(Researcher.llmApiEndpointUrl, {
        signal: controller.signal,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestParams),
      });

    return [
      promise.then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error.message);
        }
        return data;
      }),
      controller,
    ];
  }

  createPrompts(searchString) {
    return [
      {
        role: "system",
        content: `You are a helpful company researcher that assists job applicants.
              Search the web for current, accurate information about a company and role at the company.
              If no role is provided, the assumed role of the job applicant is Software Engineer.
              Please highlight any negatives or red flags that an applicant would want to know about.
              Do not rely solely on the company website to be the single source of truth about the company.`,
      },
      {
        role: "user",
        content: `Research information about ${searchString} and provide the following section headings and information. Add a line break after each section heading:
          - The first line should be a header containing the full company name and a link to their website if available.
          - 🏢 Overview: A description of the company. Keep this section very brief.
          - 🧑‍💻 Interview Process: Information about their hiring process and what to expect. How are potential candidates treated, are they frequently ghosted by the company, etc.
          - 💰 Salary: Salary information at this company. How does it align with the industry average?
          - 🎮 Tech Stack: Technologies, programming languages, frameworks, and tools they use.
          - 🍻 Work Culture: Work environment, engineering practices, team structure, and company culture. What do current and former employees have to say about it?
          - 🌱 Ethics and Sustainability: Insights into the company's ethical practices, sustainability initiatives, environmental impact, ESG commitments.
          - 🎯 Cover Letter Hooks: Recent news, initiatives, or company values that could be mentioned in a cover letter to show genuine interest. List two or three.
          - ⚠️ Possible Red Flags: Summary of negative information, controversies, or criticisms about the company that are relevant to job candidates.

          Important Guidelines:
          - Keep each section brief and the language short and concise.
          - Don't add extra sections like Notes, Sources, References, Summary, Conclusion, etc.
          - Do not omit negative information or criticisms of the company.
          - Make cover letter hooks relevant, specific and actionable.
          - If information is not available for a section, don't include that section nor mention that the information isn't available.
          - If it's not clear what specific company the user is asking about, give a list of companies you think they might be referring to instead of a detailed report.
          - You should only give information about real, registered companies.

          Your responses should give precedence to information obtained from these websites, in order of priority:
          - glassdoor.com
          - levels.fyi
          - teamblind.com
          - news.ycombinator.com
          - comparably.com
          - fishbowlapp.com
          - vault.com
          - jobcase.com
          - careerbliss.com
          - interviewquery.com
          - thelayoff.com
          - linkedin.com
          - x.com
          - angel.co
          - crunchbase.com
          - linkedin.com
          - reddit.com
          `,
      },
    ];
  }
}
