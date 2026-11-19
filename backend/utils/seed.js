require("dotenv").config();

const mongoose = require("mongoose");
const Career = require("../models/Career");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/skillforge";

const initialCareers = [
  {
    title: "Full-Stack MERN Developer",
    description:
      "Build scalable web applications using MongoDB, Express, React, and Node.js.",
    difficultyLevel: "Intermediate",
    requiredSkills: [
      {
        skillName: "HTML5 & CSS3",
        orderIndex: 0,
        tasks: [
          "Semantic HTML structure",
          "CSS Grid & Flexbox layouts",
          "Responsive design principles",
        ],
      },
      {
        skillName: "JavaScript (ES6+)",
        orderIndex: 1,
        tasks: [
          "Closures and Scope",
          "Async/Await and Promises",
          "Array manipulation methods",
        ],
      },
      {
        skillName: "Node.js & Express",
        orderIndex: 2,
        tasks: [
          "RESTful API architecture",
          "Middleware and Error handling",
          "JWT Authentication setup",
        ],
      },
      {
        skillName: "MongoDB & Mongoose",
        orderIndex: 3,
        tasks: [
          "Schema design and validation",
          "CRUD operations",
          "Aggregation pipelines",
        ],
      },
    ],
  },
  {
    title: "Data Science & Analytics Engineer",
    description:
      "Analyze complex datasets, build machine learning models, and drive data-informed decisions.",
    difficultyLevel: "Advanced",
    requiredSkills: [
      {
        skillName: "Python Programming",
        orderIndex: 0,
        tasks: [
          "Data structures and OOP in Python",
          "File handling and error management",
        ],
      },
      {
        skillName: "Pandas & NumPy",
        orderIndex: 1,
        tasks: [
          "Data cleaning and dataframe manipulation",
          "Vectorized numerical operations",
        ],
      },
      {
        skillName: "SQL & Relational Databases",
        orderIndex: 2,
        tasks: [
          "Complex JOINs and Subqueries",
          "Database indexing and optimization",
        ],
      },
    ],
  },
  {
    title: "Cloud & DevOps Practitioner",
    description:
      "Automate CI/CD pipelines, containerize applications, and manage cloud infrastructure.",
    difficultyLevel: "Advanced",
    requiredSkills: [
      {
        skillName: "Git & GitHub Actions",
        orderIndex: 0,
        tasks: [
          "Branching strategies and merge conflict resolution",
          "Automated CI/CD workflow setup",
        ],
      },
      {
        skillName: "Docker & Containers",
        orderIndex: 1,
        tasks: [
          "Writing multi-stage Dockerfiles",
          "Docker Compose for multi-container apps",
        ],
      },
      {
        skillName: "Linux & Bash Scripting",
        orderIndex: 2,
        tasks: [
          "File permissions and process management",
          "Automated shell scripts for backup",
        ],
      },
    ],
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding.");

    if (process.argv.includes("--reset")) {
      await Career.deleteMany({});
      console.log("Existing career blueprints cleared.");
    }

    for (const careerData of initialCareers) {
      await Career.findOneAndUpdate(
        { title: careerData.title },
        { $set: careerData },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );
    }

    console.log("Career blueprints seeded successfully.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { initialCareers, seedDatabase };
