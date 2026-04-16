const mongoose = require('mongoose');

const bodyMeasurementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Can be trainer or user themselves
      required: [true, "Recorder is required"],
    },
    date: {
      type: Date,
      required: [true, "Measurement date is required"],
      validate: {
        validator: (v) => v <= new Date(),
        message: "Measurement date cannot be in the future",
      },
    },
    weight: {
      type: Number,
      min: [20, "Weight seems too low (min 20 kg)"],
      max: [300, "Weight seems too high (max 300 kg)"],
    },
    height: {
      type: Number,
      min: [100, "Height must be at least 100 cm"],
      max: [250, "Height cannot exceed 250 cm"],
    },
    bodyFatPercentage: {
      type: Number,
      min: [2, "Body fat % too low"],
      max: [60, "Body fat % too high"],
    },
    muscleMassKg: { type: Number, min: 0 },
    measurements: {
      chest: { type: Number, min: 0 },
      waist: { type: Number, min: 0 },
      hips: { type: Number, min: 0 },
      leftArm: { type: Number, min: 0 },
      rightArm: { type: Number, min: 0 },
      leftThigh: { type: Number, min: 0 },
      rightThigh: { type: Number, min: 0 },
      neck: { type: Number, min: 0 },
      shoulders: { type: Number, min: 0 },
    },
    photos: {
      front: { type: String },
      back: { type: String },
      side: { type: String },
    },
    notes: { type: String, maxlength: [500, "Notes too long"], trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: BMI
bodyMeasurementSchema.virtual("bmi").get(function () {
  if (this.weight && this.height) {
    return parseFloat((this.weight / Math.pow(this.height / 100, 2)).toFixed(1));
  }
  return null;
});

// Virtual: BMI category
bodyMeasurementSchema.virtual("bmiCategory").get(function () {
  const bmi = this.bmi;
  if (!bmi) return null;
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
});

bodyMeasurementSchema.index({ user: 1, date: -1 });

// ── Workout Log Schema ────────────────────────────────────────────────────────
const workoutLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    workoutPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutPlan",
    },
    date: {
      type: Date,
      required: [true, "Workout date is required"],
      validate: {
        validator: (v) => v <= new Date(),
        message: "Workout date cannot be in the future",
      },
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [5, "Workout must be at least 5 minutes"],
      max: [480, "Workout cannot exceed 8 hours"],
    },
    caloriesBurned: {
      type: Number,
      min: [0, "Calories burned cannot be negative"],
    },
    exercises: [
      {
        exercise: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exercise",
          required: [true, "Exercise is required"],
        },
        sets: [
          {
            setNumber: { type: Number, required: true, min: 1 },
            reps: { type: Number, min: [0, "Reps cannot be negative"] },
            weight: { type: Number, min: [0, "Weight cannot be negative"] },
            duration: { type: Number, min: 0 }, // for time-based exercises (seconds)
            distance: { type: Number, min: 0 }, // for cardio (meters)
            restTime: { type: Number, min: 0 }, // seconds
            rpe: {
              type: Number,
              min: [1, "RPE must be between 1 and 10"],
              max: [10, "RPE must be between 1 and 10"],
              comment: "Rate of Perceived Exertion",
            },
            isPersonalRecord: { type: Boolean, default: false },
            notes: { type: String, maxlength: 100 },
          },
        ],
        order: { type: Number, min: 1 },
      },
    ],
    mood: {
      type: String,
      enum: {
        values: ["great", "good", "average", "tired", "terrible"],
        message: "Invalid mood value",
      },
    },
    energyLevel: {
      type: Number,
      min: [1, "Energy level must be between 1 and 10"],
      max: [10, "Energy level must be between 1 and 10"],
    },
    notes: { type: String, maxlength: [500, "Notes too long"], trim: true },
  },
  { timestamps: true }
);

workoutLogSchema.index({ user: 1, date: -1 });
workoutLogSchema.index({ workoutPlan: 1 });

// ── Per-exercise set logs (API: POST/GET /api/v1/progress) ───────────────────
const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercise is required'],
    },
    workoutPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
    },
    date: {
      type: Date,
      default: Date.now,
      validate: {
        validator: (v) => v <= new Date(),
        message: 'Progress date cannot be in the future',
      },
    },
    sets: [
      {
        setNumber: { type: Number, required: true, min: 1 },
        reps: { type: Number, required: true, min: 1, max: 200 },
        weight: { type: Number, default: 0, min: 0, max: 1000 },
        completed: { type: Boolean, default: true },
      },
    ],
    notes: { type: String, maxlength: [500, 'Notes too long'], trim: true },
    totalVolume: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

progressSchema.pre('validate', function (next) {
  if (Array.isArray(this.sets) && this.sets.length) {
    this.totalVolume = this.sets.reduce(
      (sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0),
      0
    );
  }
  next();
});

progressSchema.index({ user: 1, date: -1 });
progressSchema.index({ user: 1, exercise: 1 });

module.exports = {
  BodyMeasurement: mongoose.model('BodyMeasurement', bodyMeasurementSchema),
  WorkoutLog: mongoose.model('WorkoutLog', workoutLogSchema),
  Progress: mongoose.model('Progress', progressSchema),
};
