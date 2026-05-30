// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing from your .env file!");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Clearing existing data...');

  await prisma.studentAnswer.deleteMany();
  await prisma.result.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.learningOutcome.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.grade.deleteMany();

  console.log('✅ Database cleared. Seeding fresh...');

  // 1. CREATE GRADES
  const grades = await Promise.all([
    prisma.grade.create({ data: { level: 3, name: 'Grade 3' } }),
    prisma.grade.create({ data: { level: 6, name: 'Grade 6' } }),
    prisma.grade.create({ data: { level: 9, name: 'Grade 9' } }),
  ]);
  const gradeMap = new Map(grades.map(g => [g.level, g.id]));

  // 2. CREATE ADMIN
  const admin = await prisma.user.create({
    data: {
      name: 'Ashraf Elsayed',
      email: 'ashrafflefl2030@gmail.com',
      password: await bcrypt.hash('123456', 12),
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin created: ashrafflefl2030@gmail.com');

  // 3. CREATE SUBJECTS (Science, Math, English)
  const scienceSubject = await prisma.subject.create({
    data: { 
      name: 'Science', 
      colorCode: 'from-emerald-500 to-teal-700', 
      description: 'Explore the natural world.' 
    },
  });

  const mathSubject = await prisma.subject.create({
    data: { 
      name: 'Math', 
      colorCode: 'from-purple-500 to-fuchsia-700', 
      description: 'Solve problems and equations.' 
    },
  });

  const englishSubject = await prisma.subject.create({
    data: { 
      name: 'English', 
      colorCode: 'from-blue-500 to-indigo-700', 
      description: 'Master language and literature.' 
    },
  });

  console.log('✅ Subjects created: Science, Math, English');

  // 4. CREATE TEACHERS — EXACTLY AS YOU ASKED
  const teacherPassword = await bcrypt.hash('teacher123', 12);

  // ─── Grade 3: 2 teachers (Math, English) ───
  const teacher3Math = await prisma.user.create({
    data: {
      name: 'Layla Samir',
      email: 'layla.samir@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: mathSubject.id, gradeId: gradeMap.get(3)! }
      }
    },
  });

  const teacher3English = await prisma.user.create({
    data: {
      name: 'Youssef Adel',
      email: 'youssef.adel@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: englishSubject.id, gradeId: gradeMap.get(3)! }
      }
    },
  });

  // ─── Grade 6: 3 teachers (Science, Math, English) ───
  const teacher6Science = await prisma.user.create({
    data: {
      name: 'Yasmin Ahmed',
      email: 'yasmin.ahmed@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: scienceSubject.id, gradeId: gradeMap.get(6)! }
      }
    },
  });

  const teacher6Math = await prisma.user.create({
    data: {
      name: 'Omar Hassan',
      email: 'omar.hassan@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: mathSubject.id, gradeId: gradeMap.get(6)! }
      }
    },
  });

  const teacher6English = await prisma.user.create({
    data: {
      name: 'Fatima Khalil',
      email: 'fatima.khalil@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: englishSubject.id, gradeId: gradeMap.get(6)! }
      }
    },
  });

  // ─── Grade 9: 3 teachers (Science, Math, English) ───
  const teacher9Science = await prisma.user.create({
    data: {
      name: 'Khaled Mahmoud',
      email: 'khaled.mahmoud@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: scienceSubject.id, gradeId: gradeMap.get(9)! }
      }
    },
  });

  const teacher9Math = await prisma.user.create({
    data: {
      name: 'Nour Ibrahim',
      email: 'nour.ibrahim@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: mathSubject.id, gradeId: gradeMap.get(9)! }
      }
    },
  });

  const teacher9English = await prisma.user.create({
    data: {
      name: 'Ahmad Tarek',
      email: 'ahmad.tarek@nafs.edu',
      password: teacherPassword,
      role: 'TEACHER',
      assignments: {
        create: { subjectId: englishSubject.id, gradeId: gradeMap.get(9)! }
      }
    },
  });

  console.log('✅ 8 Teachers created and assigned');

  // 5. CREATE STUDENTS (10 per grade = 30 total)
  const studentPassword = await bcrypt.hash('student123', 12);

  const studentNames = [
    // Grade 3 (indices 0-9)
    'Adam Khaled', 'Mariam Fathi', 'Ziad Nasser', 'Salma Hossam', 'Ibrahim Yassin',
    'Farida Mostafa', 'Yahya Galal', 'Habiba Sherif', 'Omar Fouda', 'Nourhan Hafez',
    // Grade 6 (indices 10-19)
    'Seif El-Din', 'Aya Kamal', 'Marwan Said', 'Reem Ashraf', 'Tamer Hosny',
    'Dalia Ibrahim', 'Hesham Fathi', 'Samar Galal', 'Wael Sherif', 'Rania Mostafa',
    // Grade 9 (indices 20-29)
    'Khaled Nasser', 'Ghada Tarek', 'Amr Samir', 'Lobna Adel', 'Karim Youssef',
    'Nada Hatem', 'Tarek Mahmoud', 'Sana Fouda', 'Bassel Khaled', 'Hana Seif',
  ];

  const students: any[] = [];
  for (let g = 0; g < 3; g++) {
    const gradeLevel = [3, 6, 9][g];
    const gradeId = gradeMap.get(gradeLevel)!;
    
    for (let i = 0; i < 10; i++) {
      const idx = g * 10 + i;
      const student = await prisma.user.create({
        data: {
          name: studentNames[idx],
          email: `student${idx + 1}@nafs.edu`,
          password: studentPassword,
          role: 'STUDENT',
          gradeId: gradeId,
        },
      });
      students.push(student);
    }
  }

  console.log('✅ 30 Students created');

  // 6. CREATE QUIZZES
  const scienceQuiz3 = await prisma.quiz.create({
    data: {
      title: 'Grade 3: Introduction to Plants',
      description: 'Learn about plant parts and photosynthesis basics.',
      gradeId: gradeMap.get(3)!,
      subjectId: scienceSubject.id,
      creatorId: teacher3Math.id, // Grade 3 has no Science teacher, so Math teacher creates it
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "What part of the plant absorbs water from the soil?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Leaves", "Stem", "Roots", "Flowers"],
            correctAnswer: "Roots",
            explanation: "Roots anchor the plant and absorb water and nutrients from the soil.",
          },
          {
            questionText: "What do plants need to make their own food?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Sunlight, water, and air", "Only water", "Only sunlight", "Soil and rocks"],
            correctAnswer: "Sunlight, water, and air",
            explanation: "Plants use photosynthesis with sunlight, water, and carbon dioxide to make glucose.",
          }
        ]
      }
    }
  });

  const mathQuiz3 = await prisma.quiz.create({
    data: {
      title: 'Grade 3: Basic Arithmetic',
      description: 'Addition, subtraction, and simple multiplication.',
      gradeId: gradeMap.get(3)!,
      subjectId: mathSubject.id,
      creatorId: teacher3Math.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "What is 7 × 8?",
            questionType: "MULTIPLE_CHOICE",
            options: ["54", "56", "48", "64"],
            correctAnswer: "56",
            explanation: "7 multiplied by 8 equals 56.",
          },
          {
            questionText: "What is 45 - 17?",
            questionType: "MULTIPLE_CHOICE",
            options: ["28", "32", "26", "30"],
            correctAnswer: "28",
            explanation: "45 minus 17 equals 28.",
          }
        ]
      }
    }
  });

  const englishQuiz3 = await prisma.quiz.create({
    data: {
      title: 'Grade 3: Vocabulary & Spelling',
      description: 'Basic vocabulary building and spelling rules.',
      gradeId: gradeMap.get(3)!,
      subjectId: englishSubject.id,
      creatorId: teacher3English.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "Which word is spelled correctly?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Recieve", "Receive", "Receve", "Recive"],
            correctAnswer: "Receive",
            explanation: "The correct spelling is 'Receive' - 'i' before 'e' except after 'c'.",
          },
          {
            questionText: "What is the plural of 'child'?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Childs", "Children", "Childes", "Childies"],
            correctAnswer: "Children",
            explanation: "The plural of 'child' is the irregular form 'children'.",
          }
        ]
      }
    }
  });

  const scienceQuiz6 = await prisma.quiz.create({
    data: {
      title: 'Grade 6: Electromagnetism & Earth Systems',
      description: 'Test your knowledge on magnetic fields and ocean climate regulation.',
      gradeId: gradeMap.get(6)!,
      subjectId: scienceSubject.id,
      creatorId: teacher6Science.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "How do oceans regulate Earth's climate?",
            questionType: "MULTIPLE_CHOICE",
            options: ["By reflecting sunlight", "Due to water's high heat capacity", "By generating wind", "By producing salt"],
            correctAnswer: "Due to water's high heat capacity",
            explanation: "Water absorbs a lot of heat without a large temperature change, stabilizing the global climate.",
          },
          {
            questionText: "What happens when you run an electric current through a wire?",
            questionType: "MULTIPLE_CHOICE",
            options: ["It cools down", "It becomes heavier", "It generates a magnetic field", "It produces water"],
            correctAnswer: "It generates a magnetic field",
            explanation: "An electric current moving through a conductor creates a magnetic field around it.",
          }
        ]
      }
    }
  });

  const mathQuiz6 = await prisma.quiz.create({
    data: {
      title: 'Grade 6: Fractions & Ratios',
      description: 'Solving complex fractional equations and ratio problems.',
      gradeId: gradeMap.get(6)!,
      subjectId: mathSubject.id,
      creatorId: teacher6Math.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "If you have a ratio of 9:17, what happens if you double both sides?",
            questionType: "MULTIPLE_CHOICE",
            options: ["18:34", "9:34", "18:17", "81:289"],
            correctAnswer: "18:34",
            explanation: "Multiplying both the numerator and denominator by 2 yields 18:34.",
          },
          {
            questionText: "What is 3/4 + 1/2?",
            questionType: "MULTIPLE_CHOICE",
            options: ["4/6", "5/4", "1/1", "3/8"],
            correctAnswer: "5/4",
            explanation: "3/4 + 2/4 = 5/4 or 1.25",
          }
        ]
      }
    }
  });

  const englishQuiz6 = await prisma.quiz.create({
    data: {
      title: 'Grade 6: Grammar & Reading Comprehension',
      description: 'Test your knowledge on subject-verb agreement and formal letter conventions.',
      gradeId: gradeMap.get(6)!,
      subjectId: englishSubject.id,
      creatorId: teacher6English.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "Which ending is pronounced distinctly as an extra syllable in past tense verbs?",
            questionType: "MULTIPLE_CHOICE",
            options: ["-ed after 't' or 'd'", "-ed after 's'", "-ed after 'k'", "-ed after vowels"],
            correctAnswer: "-ed after 't' or 'd'",
            explanation: "Words like 'wanted' or 'needed' add an extra syllable.",
          },
          {
            questionText: "What is the most appropriate closing for a formal letter?",
            questionType: "MULTIPLE_CHOICE",
            options: ["See ya", "Yours sincerely,", "Cheers,", "Best wishes,"],
            correctAnswer: "Yours sincerely,",
            explanation: "Formal letters require formal sign-offs like 'Yours sincerely' or 'Yours faithfully'.",
          }
        ]
      }
    }
  });

  const scienceQuiz9 = await prisma.quiz.create({
    data: {
      title: 'Grade 9: Advanced Physics & Chemistry',
      description: 'Atomic structure, chemical bonds, and Newtonian mechanics.',
      gradeId: gradeMap.get(9)!,
      subjectId: scienceSubject.id,
      creatorId: teacher9Science.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "What is the charge of a proton?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Negative", "Neutral", "Positive", "Variable"],
            correctAnswer: "Positive",
            explanation: "Protons carry a positive charge, electrons carry negative, and neutrons are neutral.",
          },
          {
            questionText: "According to Newton's Third Law, for every action there is:",
            questionType: "MULTIPLE_CHOICE",
            options: ["A greater reaction", "An equal and opposite reaction", "No reaction", "A delayed reaction"],
            correctAnswer: "An equal and opposite reaction",
            explanation: "Newton's Third Law states that forces always occur in pairs.",
          }
        ]
      }
    }
  });

  const mathQuiz9 = await prisma.quiz.create({
    data: {
      title: 'Grade 9: Algebra & Quadratic Equations',
      description: 'Solve quadratic equations and understand parabola properties.',
      gradeId: gradeMap.get(9)!,
      subjectId: mathSubject.id,
      creatorId: teacher9Math.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "What is the discriminant of the quadratic equation ax² + bx + c = 0?",
            questionType: "MULTIPLE_CHOICE",
            options: ["b² - 4ac", "b² + 4ac", "2b - 4ac", "b² - 2ac"],
            correctAnswer: "b² - 4ac",
            explanation: "The discriminant (b² - 4ac) determines the nature of the roots of a quadratic equation.",
          },
          {
            questionText: "If x² - 5x + 6 = 0, what are the values of x?",
            questionType: "MULTIPLE_CHOICE",
            options: ["1 and 6", "2 and 3", "-2 and -3", "5 and 1"],
            correctAnswer: "2 and 3",
            explanation: "Factoring: (x-2)(x-3) = 0, so x = 2 or x = 3.",
          }
        ]
      }
    }
  });

  const englishQuiz9 = await prisma.quiz.create({
    data: {
      title: 'Grade 9: Advanced Literature Analysis',
      description: 'Analyze themes, motifs, and character development in classic literature.',
      gradeId: gradeMap.get(9)!,
      subjectId: englishSubject.id,
      creatorId: teacher9English.id,
      isPublished: true,
      questions: {
        create: [
          {
            questionText: "In Shakespeare's 'Macbeth', what does blood primarily symbolize?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Life and vitality", "Guilt and remorse", "Royal lineage", "War and violence"],
            correctAnswer: "Guilt and remorse",
            explanation: "Blood symbolizes the guilt that haunts Macbeth and Lady Macbeth after their crimes.",
          },
          {
            questionText: "What literary device is used when non-human objects are given human qualities?",
            questionType: "MULTIPLE_CHOICE",
            options: ["Metaphor", "Simile", "Personification", "Alliteration"],
            correctAnswer: "Personification",
            explanation: "Personification attributes human characteristics to animals, objects, or abstract concepts.",
          }
        ]
      }
    }
  });

  console.log('✅ 9 Quizzes created');

  // 7. CREATE SAMPLE RESULTS
  await prisma.result.createMany({
    data: [
      // Grade 3 results
      { score: 100, totalPoints: 100, studentId: students[0].id, quizId: scienceQuiz3.id },
      { score: 90, totalPoints: 100, studentId: students[1].id, quizId: mathQuiz3.id },
      { score: 85, totalPoints: 100, studentId: students[2].id, quizId: englishQuiz3.id },
      { score: 95, totalPoints: 100, studentId: students[3].id, quizId: scienceQuiz3.id },
      
      // Grade 6 results
      { score: 100, totalPoints: 100, studentId: students[10].id, quizId: scienceQuiz6.id },
      { score: 85, totalPoints: 100, studentId: students[11].id, quizId: englishQuiz6.id },
      { score: 90, totalPoints: 100, studentId: students[12].id, quizId: mathQuiz6.id },
      { score: 75, totalPoints: 100, studentId: students[13].id, quizId: scienceQuiz6.id },
      { score: 88, totalPoints: 100, studentId: students[14].id, quizId: englishQuiz6.id },
      
      // Grade 9 results
      { score: 95, totalPoints: 100, studentId: students[20].id, quizId: scienceQuiz9.id },
      { score: 80, totalPoints: 100, studentId: students[21].id, quizId: englishQuiz9.id },
      { score: 88, totalPoints: 100, studentId: students[22].id, quizId: mathQuiz9.id },
      { score: 92, totalPoints: 100, studentId: students[23].id, quizId: scienceQuiz9.id },
      { score: 78, totalPoints: 100, studentId: students[24].id, quizId: mathQuiz9.id },
    ]
  });

  console.log('✅ 15 Sample results created');

  // SUMMARY
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         ✅ DATABASE SEEDED SUCCESSFULLY!            ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log('║  Admin:        1  (ashrafflefl2030@gmail.com)      ║');
  console.log('║  Grades:       3  (3, 6, 9)                        ║');
  console.log('║  Subjects:     3  (Science, Math, English)          ║');
  console.log('║  Teachers:     8                                   ║');
  console.log('║    • Grade 3:  2 teachers (Math, English)          ║');
  console.log('║    • Grade 6:  3 teachers (Science, Math, English)  ║');
  console.log('║    • Grade 9:  3 teachers (Science, Math, English)  ║');
  console.log('║  Students:     30 (10 per grade)                   ║');
  console.log('║  Quizzes:      9 (3 per grade)                     ║');
  console.log('║  Results:      15 sample submissions               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🔐 Login Credentials:');
  console.log('   Admin:    ashrafflefl2030@gmail.com / 123456');
  console.log('   Teachers: any teacher email / teacher123');
  console.log('   Students: student1@nafs.edu - student30@nafs.edu / student123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });