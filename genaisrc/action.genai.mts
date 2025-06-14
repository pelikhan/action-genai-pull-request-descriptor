script({
  responseType: "markdown",
  accept: "none",
  branding: {
    color: "yellow",
    icon: "hard-drive",
  },
  parameters: {
    base: {
      type: "string",
      description: "The base branch of the pull request",
    },
    instructions: {
      type: "string",
      description: "Instructions for the code reviewer",
    },
    maxTokens: {
      type: "number",
      description: "The maximum number of tokens to generate",
      default: 14000,
    },
  },
});

const { vars, dbg } = env;
const { instructions } = vars;
const maxTokens = vars.maxTokens;
const base = vars.base || (await git.defaultBranch());
const branch = await git.branch();

dbg(`base: %s`, base);
dbg(`branch: %s`, branch);

if (branch === base) cancel("Already on the base branch!");

// compute diff
const changes = await git.diff({
  base: base,
});

console.debug(changes);

def("GIT_DIFF", changes, {
  maxTokens,
  detectPromptInjection: "available",
});

// task
$`## Task

You are an expert code reviewer with great technical writing skills.

Your task is to generate a high level summary of the changes in <GIT_DIFF> for a pull request in a way that a software engineer will understand.
This description will be used as the pull request description.

## Instructions

- do NOT explain that GIT_DIFF displays changes in the codebase
- try to extract the intent of the changes, don't focus on the details
- use bullet points to list the changes
- use emojis to make the description more engaging
- focus on the most important changes
- do not try to fix issues, only describe the changes
- ignore comments about imports (like added, remove, changed, etc.)
- do not generate links
`.role("system");
if (instructions) $`${instructions}`.role("system");
