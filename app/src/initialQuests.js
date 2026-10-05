// src/initialQuests.js
const initialQuests = [
  // EASY QUESTS (50 Points)
  { title: "Ghost Power Hunt", description: "Unplug 3 appliances or charger bricks that are idle or fully charged.", points: 50, difficulty: "Easy", proof_required: true, tags: ["Energy", "Home"] },
  { title: "Natural Daylight Shift", description: "Keep ambient ceiling lights off for 2 consecutive daytime study/work hours.", points: 50, difficulty: "Easy", proof_required: true, tags: ["Energy", "Home"] },

  // MEDIUM QUESTS (100 Points)
  { title: "Active Commute", description: "Use public transit, cycling, or walking for your campus/work trip.", points: 100, difficulty: "Medium", proof_required: true, tags: ["Mobility", "Habit"] },
  { title: "Zero Single-Use Day", description: "Use only reusable mugs, cutlery, and water bottles throughout the entire day.", points: 100, difficulty: "Medium", proof_required: false, tags: ["Consumption", "Habit"] },

  // HARD QUESTS (150 Points)
  { title: "Car-Free Errand", description: "Walk or bike to complete an errand (like groceries) you would normally drive to.", points: 150, difficulty: "Hard", proof_required: true, tags: ["Mobility", "Fitness"] },
  { title: "No-Buy Day", description: "Spend $0 today on non-essential manufactured goods or single-use items.", points: 150, difficulty: "Hard", proof_required: false, tags: ["Consumption", "Habit"] }
];

export default initialQuests;