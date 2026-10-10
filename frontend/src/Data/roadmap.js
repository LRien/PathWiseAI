/* Mock roadmaps, keyed by the exact career title used in predictions.js.
   TODO: replace with data from your backend / dataset later. */
export const ROADMAPS = {
  'Data Scientist': {
    summary: 'Turn raw data into predictions and decisions using statistics, programming and machine learning.',
    timeframe: '6–12 months',
    keySkills: ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Analysis', 'Data Visualization'],
    phases: [
      {
        title: 'Build the foundation',
        duration: 'Months 1–2',
        steps: ['Review probability and statistics basics', 'Practice data wrangling with pandas', 'Learn data visualization (Matplotlib / Seaborn)'],
        resources: ['Kaggle Learn: Pandas', 'Khan Academy: Statistics'],
      },
      {
        title: 'Learn machine learning',
        duration: 'Months 3–5',
        steps: ['Study supervised and unsupervised algorithms', 'Practice with scikit-learn', 'Learn model evaluation and feature engineering'],
        resources: ['Kaggle Learn: Intro to ML', 'Andrew Ng: Machine Learning Specialization'],
      },
      {
        title: 'Build your portfolio',
        duration: 'Months 6–9',
        steps: ['Complete 2–3 end-to-end projects', 'Enter a Kaggle competition', 'Publish your work on GitHub with clear write-ups'],
        resources: ['Kaggle competitions', 'GitHub'],
      },
      {
        title: 'Get job-ready',
        duration: 'Months 9–12',
        steps: ['Apply for internships or junior analyst roles', 'Practice SQL and case-study interviews', 'Network on LinkedIn and local data communities'],
        resources: ['LeetCode (SQL)', 'LinkedIn'],
      },
    ],
  },

  'Machine Learning Engineer': {
    summary: 'Design, train and deploy machine learning models that run reliably in production.',
    timeframe: '9–15 months',
    keySkills: ['Python', 'Machine Learning', 'Deep Learning', 'SQL', 'Software Engineering', 'MLOps'],
    phases: [
      {
        title: 'Strengthen the core',
        duration: 'Months 1–3',
        steps: ['Practice data structures and algorithms', 'Learn linear algebra and calculus essentials', 'Write clean, tested Python code'],
        resources: ['NeetCode', '3Blue1Brown: Essence of Linear Algebra'],
      },
      {
        title: 'Master ML and deep learning',
        duration: 'Months 4–7',
        steps: ['Learn scikit-learn and PyTorch', 'Build neural networks for vision and text', 'Understand training, tuning and evaluation'],
        resources: ['fast.ai Practical Deep Learning', 'PyTorch tutorials'],
      },
      {
        title: 'Learn to deploy',
        duration: 'Months 8–11',
        steps: ['Learn Docker and REST APIs (FastAPI)', 'Deploy a model to the cloud', 'Track experiments with MLflow or Weights & Biases'],
        resources: ['Docker docs', 'Made With ML'],
      },
      {
        title: 'Launch your career',
        duration: 'Months 12–15',
        steps: ['Build a deployed ML project for your portfolio', 'Apply for ML or software internships', 'Prepare for coding and ML system design interviews'],
        resources: ['Designing Machine Learning Systems (book)'],
      },
    ],
  },

  'Software Engineer': {
    summary: 'Design, build and maintain software systems and applications.',
    timeframe: '6–12 months',
    keySkills: ['Python', 'Data Structures', 'Algorithms', 'Git', 'Databases', 'Problem Solving'],
    phases: [
      {
        title: 'Programming fundamentals',
        duration: 'Months 1–2',
        steps: ['Get comfortable in one main language', 'Learn Git and GitHub workflows', 'Practice basic data structures'],
        resources: ['CS50', 'Pro Git (free book)'],
      },
      {
        title: 'Build real applications',
        duration: 'Months 3–5',
        steps: ['Build a full-stack web app', 'Learn SQL and database design', 'Write unit tests'],
        resources: ['The Odin Project', 'freeCodeCamp'],
      },
      {
        title: 'Level up',
        duration: 'Months 6–9',
        steps: ['Study algorithms and system design basics', 'Contribute to an open-source project', 'Learn CI/CD and cloud basics'],
        resources: ['LeetCode', 'GitHub Good First Issues'],
      },
      {
        title: 'Job search',
        duration: 'Months 9–12',
        steps: ['Polish your resume and portfolio', 'Apply for internships and junior roles', 'Do mock interviews'],
        resources: ['Pramp', 'LinkedIn'],
      },
    ],
  },

  'Data Analyst': {
    summary: 'Collect, clean and interpret data to help teams make better business decisions.',
    timeframe: '3–6 months',
    keySkills: ['SQL', 'Excel', 'Data Analysis', 'Data Visualization', 'Python', 'Statistics'],
    phases: [
      {
        title: 'Core tools',
        duration: 'Month 1',
        steps: ['Master SQL joins, aggregations and window functions', 'Get strong in Excel / Google Sheets', 'Learn basic descriptive statistics'],
        resources: ['Mode SQL Tutorial', 'Excel Basics (free)'],
      },
      {
        title: 'Analysis and visualization',
        duration: 'Months 2–3',
        steps: ['Learn pandas for data cleaning', 'Build dashboards in Power BI or Tableau', 'Practice telling a story with data'],
        resources: ['Kaggle Learn: Data Cleaning', 'Tableau Public'],
      },
      {
        title: 'Portfolio and applications',
        duration: 'Months 4–6',
        steps: ['Complete 3 analysis projects on real datasets', 'Publish dashboards publicly', 'Apply for analyst and internship roles'],
        resources: ['Kaggle datasets', 'LinkedIn'],
      },
    ],
  },

  'Research Scientist': {
    summary: 'Investigate open problems, run experiments and publish new findings.',
    timeframe: '2–5 years',
    keySkills: ['Research Methods', 'Python', 'Statistics', 'Critical Thinking', 'Academic Writing', 'Machine Learning'],
    phases: [
      {
        title: 'Research foundations',
        duration: 'Year 1',
        steps: ['Read papers in your area weekly', 'Learn experiment design and statistics', 'Learn LaTeX and reference managers'],
        resources: ['arXiv', 'Google Scholar', 'Zotero'],
      },
      {
        title: 'Get hands-on',
        duration: 'Year 1–2',
        steps: ['Join a lab or research group as an assistant', 'Reproduce results from a published paper', 'Present at a seminar or student conference'],
        resources: ['University research labs', 'Papers With Code'],
      },
      {
        title: 'Publish and specialize',
        duration: 'Year 2–4',
        steps: ['Co-author a paper', 'Pursue a master\'s or PhD', 'Build a professional network at conferences'],
        resources: ['Conference calls for papers', 'Graduate program listings'],
      },
    ],
  },

  'Systems Analyst': {
    summary: 'Bridge business needs and technology by analyzing, designing and improving IT systems.',
    timeframe: '4–8 months',
    keySkills: ['Requirements Analysis', 'SQL', 'Process Modeling', 'Communication', 'Problem Solving', 'Documentation'],
    phases: [
      {
        title: 'Analysis fundamentals',
        duration: 'Months 1–2',
        steps: ['Learn requirements gathering and user stories', 'Learn UML and process diagrams', 'Practice writing clear documentation'],
        resources: ['BABOK overview', 'Lucidchart tutorials'],
      },
      {
        title: 'Technical grounding',
        duration: 'Months 3–5',
        steps: ['Strengthen SQL and database basics', 'Understand APIs and system integration', 'Learn Agile and Scrum'],
        resources: ['Scrum Guide', 'Mode SQL Tutorial'],
      },
      {
        title: 'Get hired',
        duration: 'Months 6–8',
        steps: ['Document a sample system as a portfolio piece', 'Consider the CBAP / ECBA certification', 'Apply for junior analyst roles'],
        resources: ['IIBA', 'LinkedIn'],
      },
    ],
  },
}

/* used when a career has no roadmap yet */
export const DEFAULT_ROADMAP = {
  summary: 'A general path for moving into this field. A tailored roadmap for this career is coming soon.',
  timeframe: '6–12 months',
  keySkills: [],
  phases: [
    { title: 'Research the field', duration: 'Month 1', steps: ['Read job postings to see required skills', 'Talk to people working in the role', 'List the skills you still need'], resources: ['LinkedIn', 'Job boards'] },
    { title: 'Learn the essentials', duration: 'Months 2–5', steps: ['Take structured online courses', 'Practice with small projects', 'Get feedback from mentors'], resources: ['Coursera', 'YouTube'] },
    { title: 'Prove your skills', duration: 'Months 6–12', steps: ['Build a portfolio', 'Apply for internships or entry-level roles', 'Keep learning and iterating'], resources: ['GitHub', 'Portfolio sites'] },
  ],
}