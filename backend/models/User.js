const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    level: { type: Number, min: 1, max: 5, default: 1 },
  },
  { _id: false }
);

const completedTaskSchema = new mongoose.Schema({
  skillName: { type: String, required: true },
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
});

const progressSchema = new mongoose.Schema({
  career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true },
  completedTasks: [completedTaskSchema],
});

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 6, select: false },
    role:       { type: String, enum: ['student', 'admin'], default: 'student' },
    careerGoal: { type: String, default: '' },
    skills:     [skillSchema],
    progress:   [progressSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);