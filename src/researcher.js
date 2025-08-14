export class Researcher {
  static openAiEndpointUrl = "https://api.openai.com/v1/chat/completions";
  static openAiModel = "gpt-4o-mini-search-preview";

  async researchCompany(controller, apiKey, searchString) {
    console.info("Researching company:", searchString);
    const response = await this.makeApiRequest(
      controller,
      apiKey,
      this.createPrompts(searchString)
    );
    try {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error.message);
      }
      return data;
    } catch (error) {
      throw new Error(error.stack);
    }
  }

  createPrompts(searchString) {
    return [
      {
        role: "system",
        content: `You are a helpful company researcher that assists job applicants.
              Search the web for current, accurate information about companies and roles at said companies.
              If no role is provided, the assumed role of the job applicant is Software Engineer.
              Please highlight any negatives or red flags that a job applicant would want to know about.
              Use your knowledge and reasoning to provide comprehensive research.`,
      },
      {
        role: "user",
        content: `
          Research information about ${searchString} and provide the following section headings and information:
          - The first line should a company name header
          - Overview: A very brief description of the company in one or two sentences, include number of employees, whether it is a startup or an established business, and details about funding. Keep this section very brief.
          - Interview Process: Information about their hiring process, interview stages, and what to expect. Include feedback from interviewees.
          - Salary: Salary information at this company. How does it align with the industry average?
          - Tech Stack: Technologies, programming languages, frameworks, and tools they use, based on job postings and other public information. Include this section if it's relevant for the role only.
          - Work Culture: Work environment, engineering practices, team structure, and company culture. What do current and former employees have to say about it?
          - In The News: Recent company news, product launches, funding rounds, or significant developments.
          - Cover Letter Hooks: Specific recent news, initiatives, or company values that could be mentioned in a cover letter to show genuine interest.
          - Possible Red Flags: Summary of negative information, controversies, or criticisms about the company that is relevant to a job applicant.

          Important Guidelines:
          - You MUST provide links for all information provided.
          - Do not omit negative information or criticisms of the company.
          - Keep the language short and concise.
          - Make cover letter hooks relevant, specific and actionable.
          - If information is not available for a section, don't include the section nor mention that the information isn't available.
          - If it's not clear what company the user is asking about, give a list of companies you think they might be referring to.
          - You should only give information about real, registered companies.

          Your responses should give precedence to information obtained from these websites:
          - glassdoor.com
          - levels.fyi
          - teamblind.com
          - reddit.com
          - news.ycombinator.com
          - comparably.com
          - fairygodboss.com
          - fishbowlapp.com
          - vault.com
          - kununu.com
          - jobcase.com
          - careerbliss.com
          - interviewquery.com
          - thelayoff.com
          - linkedin.com
          - x.com
          - angel.co
          `,
      },
    ];
  }

  async makeApiRequest(controller, apiKey, messages) {
    return fetch(Researcher.openAiEndpointUrl, {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Researcher.openAiModel,
        messages: messages,
        max_tokens: 2500,
      }),
    });
  }
}
