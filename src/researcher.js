export class Researcher {
  static llmEndpointUrl = "https://api.openai.com/v1/chat/completions";
  static llmModelName = "gpt-4o-mini-search-preview";
  static llmParams = {
    max_tokens: 5000,
    web_search_options: {
      search_context_size: "high",
    },
  };

  researchCompany(apiKey, searchString) {
    console.info("Researching company:", searchString);
    const controller = new AbortController(),
      promise = fetch(Researcher.llmEndpointUrl, {
        signal: controller.signal,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Researcher.llmModelName,
          messages: this.createPrompts(searchString),
          ...Researcher.llmParams,
        }),
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
              Please highlight any negatives or red flags that a job applicant would want to know about.
-             Use your knowledge and reasoning to provide comprehensive research.`,
      },
      {
        role: "user",
        content: `Research information about ${searchString} and provide the following section headings and information. Add a line break after each section heading:
          - The first line should be a company name header only
          - 🏢 Overview: A description of the company. Keep this section very brief.
          - 🧑‍💻 Interview Process: Information about their hiring process and what to expect.
          - 💰 Salary: Salary information at this company. How does it align with the industry average?
          - 🎮 Tech Stack: Technologies, programming languages, frameworks, and tools they use.
          - 🍻 Work Culture: Work environment, engineering practices, team structure, and company culture. What do current and former employees have to say about it?
          - 🌱 Ethics and Sustainability: Insights into the company's ethical practices, sustainability initiatives, environmental impact, ESG commitments.
          - 🎯 Cover Letter Hooks: Recent news, initiatives, or company values that could be mentioned in a cover letter to show genuine interest.
          - ⚠️ Possible Red Flags: Summary of negative information, controversies, or criticisms about the company that is relevant to a job applicant.

          Important Guidelines:
          - You MUST provide links for all information provided.
          - Do not omit negative information or criticisms of the company.
          - Keep the language short and concise.
          - Make cover letter hooks relevant, specific and actionable.
          - If information is not available for a section, don't include that section nor mention that the information isn't available.
          - If it's not clear what company the user is asking about, give a list of companies you think they might be referring to.
          - You should only give information about real, registered companies.

          Your responses should give precedence to information obtained from these websites:
          - glassdoor.com
          - levels.fyi
          - teamblind.com
          - reddit.com
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
          `,
      },
    ];
  }
}
