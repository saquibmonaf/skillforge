const mongoose = require("mongoose");

/**
 * Career blueprint — a template of skills + ordered learning tasks
 * that students can be evaluated against (used by the gap-analysis engine).
 */
const careerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Career title is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    difficultyLevel: {
      type: String,
      trim: true,
      default: "",
    },
    // Ordered blueprint of skills a student needs to acquire
    requiredSkills: [
      {
        skillName: {
          type: String,
          required: [true, "Skill name is required"],
          trim: true,
        },
        orderIndex: {
          type: Number,
          required: true,
          default: 0,
        },
        tasks: {
          type: [String],
          default: [],
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Career", careerSchema);
