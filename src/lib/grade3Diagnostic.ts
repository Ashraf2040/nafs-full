export type DiagnosticItem = {
  number: number;
  prompt: string;
  options: string[];
  answer: string;
  outcomeCode?: string;
  outcomeIndicator?: number;
  outcome: string;
  coverage?: "Aligned" | "Partially aligned" | "Not exist";
  imageUrl?: string;
};

export const grade3MathItems: DiagnosticItem[] = [
  { number: 1, prompt: "Which of the following number lines represents the fraction that indicates the number of open windows?", options: ["A", "B", "C", "D"], answer: "B", outcomeCode: "3-4-1-1-2", outcome: "Fractions as parts of a whole or parts of a set", coverage: "Partially aligned", imageUrl: "/diagnostics/grade3-math-q1-number-lines.png" },
  { number: 2, prompt: "Which shape fills in the blank in the pattern below?", options: ["A", "B", "C", "D"], answer: "C", outcomeCode: "3-4-2-1-1", outcome: "Non-numeric patterns using attributes", coverage: "Not exist", imageUrl: "/diagnostics/grade3-math-q2-pattern.png" },
  { number: 3, prompt: "Which 3-D shape has one vertex and no edges?", options: ["A. Pyramid", "B. Cone", "C. Cube", "D. Cylinder"], answer: "B. Cone", outcomeCode: "3-4-3-1-1", outcome: "Describe and classify 3-D shapes by faces, vertices, and edges", coverage: "Partially aligned" },
  { number: 4, prompt: "What is the missing number that makes the addition sentence true?", options: ["A", "B", "C", "D"], answer: "A", outcomeCode: "3-4-1-2-1", outcome: "Add and subtract whole numbers up to three digits", coverage: "Aligned", imageUrl: "/diagnostics/grade3-math-q4-addition.png" },
  { number: 5, prompt: "Khalid had 10 boxes. He kept two for himself and shared the remaining boxes equally among 4 friends. How many boxes did each friend get?", options: ["A. 5", "B. 4", "C. 3", "D. 2"], answer: "D. 2", outcomeCode: "3-4-1-2-2", outcome: "Equal sharing and one- and two-step real-life problems", coverage: "Aligned" },
  { number: 6, prompt: "Which of the following statements is true about the two colored rectangles?", options: ["A. They have the same perimeter.", "B. They have the same area.", "C. The perimeter of rectangle (1) is greater than the perimeter of rectangle (2).", "D. The area of rectangle (1) is greater than the area of rectangle (2)."], answer: "A. They have the same perimeter.", outcomeCode: "3-4-3-2-1", outcome: "Perimeter of polygons and area on a square grid", coverage: "Partially aligned", imageUrl: "/diagnostics/grade3-math-q6-rectangles.png" },
  { number: 7, prompt: "If the duration of the math class is 50 minutes and it starts at 8:15, what time does the class end?", options: ["A. 9:00", "B. 9:05", "C. 9:15", "D. 9:50"], answer: "B. 9:05", outcomeCode: "3-4-3-2-4", outcome: "Solve elapsed-time problems and explain the solution", coverage: "Partially aligned" },
  { number: 8, prompt: "If Majid sold 45 shirts on the third day, which of the following completes the table below?", options: ["A", "B", "C", "D"], answer: "C", outcomeCode: "3-4-4-1-1", outcome: "Represent data with bar graphs and symbols", coverage: "Partially aligned", imageUrl: "/diagnostics/grade3-math-q8-pictograph.png" },
];

export const grade3EnglishItems: DiagnosticItem[] = [
  { number: 9, prompt: "“The science teacher used the right instrument for the experiment.” Which word is closest in meaning to “instrument” in this sentence?", options: ["A. device", "B. idea", "C. case", "D. signal"], answer: "A. device", outcomeCode: "3.2.1.1.1", outcomeIndicator: 1, outcome: "Identifying the synonyms and antonyms of vocabulary mentioned in the text and clarifying their meanings." },
  { number: 10, prompt: "“The student’s backpack was heavy. He could barely lift it.” What does “heavy” mean in this sentence?", options: ["A. easy to lift", "B. very small", "C. super strong", "D. hard to carry"], answer: "D. hard to carry", outcomeCode: "3.2.1.1.1", outcomeIndicator: 1, outcome: "Identifying the synonyms and antonyms of vocabulary mentioned in the text and clarifying their meanings." },
  { number: 11, prompt: "Why did Linda dig small holes in the soil?", options: ["A. to store water underground for later use.", "B. to hide extra seeds she didn’t want to plant.", "C. to keep insects away from her flower garden.", "D. to help the soil get air and improve plant growth."], answer: "D. to help the soil get air and improve plant growth.", outcomeCode: "3.2.1.1.2", outcomeIndicator: 4, outcome: "Determining causes, results, and relationships, and describing motives and actions of the characters in a text." },
  { number: 12, prompt: "Which event happened before the flowers bloomed again in Linda’s garden?", options: ["A. The plants were gently watered and the wilted leaves were trimmed.", "B. Butterflies moved around the bright flowers in the warm sunlight.", "C. The garden was filled with fully opened flowers of different colors.", "D. A warm smile appeared as the healthy plants were admired happily."], answer: "A. The plants were gently watered and the wilted leaves were trimmed.", outcomeCode: "3.2.1.1.2", outcomeIndicator: 3, outcome: "Identifying the components and elements of the text, and arranging events, ideas, or information according to their occurrence." },
  { number: 13, prompt: "Your friend wants to grow a healthy plant. Based on what Linda did in the story, what advice would you give him?", options: ["A. Plant the seed in good soil, water it regularly, and make sure it gets sunlight.", "B. Leave the seed in a dry container without soil or light, and avoid giving it water.", "C. Place the seed in a dark closet, ignore it completely, and expect it to grow on its own.", "D. Keep the seed on a shelf indoors without planting it or giving it what it needs to grow."], answer: "A. Plant the seed in good soil, water it regularly, and make sure it gets sunlight.", outcomeCode: "3.2.1.1.3", outcomeIndicator: 5, outcome: "Suggesting a title, an ending different from the end of the read text, and solutions to problems or issues appeared within." },
];

export const grade3Passage = "Linda loved her small garden and enjoyed watching her plants grow. One week, she went on vacation and forgot to water them. When she returned, the flowers looked sad and wilted, and a few leaves had turned brown. She carefully watered each plant, trimmed the dry leaves, pulled out weeds, and cleared fallen petals. She even dug small holes to help the soil breathe.\n\nPlants need sunlight, water, and air to grow. Each plant starts as a tiny seed. When planted in good soil and given water, the seed begins to sprout. Roots grow downward to find water, and stems grow upward toward the sunlight. Over time, seedlings get taller and develop green leaves. Air and sunlight help plants make their own food through photosynthesis.\n\nLinda checked her garden every day and noticed tiny buds slowly peeking through the soil. After a few weeks, the flowers bloomed beautifully, and butterflies came to visit. Linda smiled, happy to see her plants alive and healthy again.";

export const grade3PassageImage = "/diagnostics/grade3-english-garden.jpg";

export const outcomeNames: Record<string, string> = Object.fromEntries(
  grade3MathItems.filter((item) => item.outcomeCode).map((item) => [item.outcomeCode!, item.outcome]),
);
