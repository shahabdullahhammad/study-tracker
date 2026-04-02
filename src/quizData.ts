import { isGrade10OrBelow, type QuizQuestion } from "./gradeQuizConfig";

/** Class 10th and below: ten mixed-difficulty items per subject. */
export const LOWER_QUIZZES: Record<string, QuizQuestion[]> = {
  math: [
    {
      difficulty: "easy",
      question: "What is 144 ÷ 12?",
      options: ["10", "11", "12", "14"],
      correctIndex: 2,
    },
    {
      difficulty: "easy",
      question: "The value of π (pi) is approximately:",
      options: ["2.71", "3.14", "1.41", "9.81"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "If x + 7 = 15, what is x?",
      options: ["6", "7", "8", "9"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Area of a circle with radius r is:",
      options: ["2πr", "πr²", "πd", "r²/2"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question:
        "The sum of angles in a triangle (in degrees) on a flat surface is:",
      options: ["90°", "180°", "270°", "360°"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "What is 7 × 8?",
      options: ["54", "56", "63", "49"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "A rectangle 5 cm by 4 cm has area:",
      options: ["9 cm²", "18 cm²", "20 cm²", "25 cm²"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Simple interest on ₹100 at 10% per year for 2 years is:",
      options: ["₹10", "₹20", "₹110", "₹121"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "If 2ⁿ = 32, then n equals:",
      options: ["4", "5", "6", "16"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "The HCF of 12 and 18 is:",
      options: ["2", "3", "6", "36"],
      correctIndex: 2,
    },
  ],
  physics: [
    {
      difficulty: "easy",
      question: "The SI unit of force is:",
      options: ["Joule", "Newton", "Watt", "Pascal"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Sound travels fastest in:",
      options: ["Vacuum", "Air", "Water", "Steel"],
      correctIndex: 3,
    },
    {
      difficulty: "medium",
      question: "Acceleration due to gravity on Earth is about:",
      options: ["8.9 m/s²", "9.8 m/s²", "10.8 m/s²", "98 m/s²"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "The law V = IR relates voltage, current, and:",
      options: ["Power", "Resistance", "Charge", "Frequency"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "Which is a vector quantity?",
      options: ["Speed", "Distance", "Velocity", "Temperature"],
      correctIndex: 2,
    },
    {
      difficulty: "easy",
      question: "The SI unit of length is:",
      options: ["Kilogram", "Metre", "Second", "Ampere"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Ice is the solid form of:",
      options: ["Oxygen", "Nitrogen", "Water", "Carbon dioxide"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Reflection of light follows the law where angle of incidence equals:",
      options: [
        "Angle of refraction",
        "Angle of reflection",
        "Critical angle",
        "Dispersion angle",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Power is the rate of doing:",
      options: ["Work", "Displacement", "Momentum", "Charge"],
      correctIndex: 0,
    },
    {
      difficulty: "hard",
      question: "In a series circuit, the same ___ passes through each component.",
      options: ["Voltage", "Current", "Resistance", "Power"],
      correctIndex: 1,
    },
  ],
  chemistry: [
    {
      difficulty: "easy",
      question: "Water’s chemical formula is:",
      options: ["CO₂", "H₂O", "NaCl", "O₂"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "The smallest unit of an element is:",
      options: ["Molecule", "Atom", "Compound", "Ion"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "pH 7 in pure water at 25 °C means the solution is:",
      options: ["Acidic", "Basic", "Neutral", "Saline"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Rusting of iron is mainly an example of:",
      options: ["Melting", "Oxidation", "Sublimation", "Neutralization"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "Avogadro’s number is approximately:",
      options: ["6.02 × 10²³", "9.8 × 10²", "3.14 × 10⁰", "1.6 × 10⁻¹⁹"],
      correctIndex: 0,
    },
    {
      difficulty: "easy",
      question: "Table salt (common salt) is mainly:",
      options: ["KCl", "NaCl", "CaCO₃", "HCl"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Which gas do plants take in for photosynthesis?",
      options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Isotopes of an element have the same ___ but different mass numbers.",
      options: [
        "Number of neutrons",
        "Atomic number",
        "Number of electrons in ions",
        "Valency only",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Burning magnesium in air gives mainly:",
      options: ["Mg(OH)₂", "MgO", "MgCO₃", "MgCl₂"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "A solution with pH 2 is:",
      options: ["Strongly basic", "Neutral", "Acidic", "Amphoteric"],
      correctIndex: 2,
    },
  ],
  biology: [
    {
      difficulty: "easy",
      question: "The powerhouse of the cell is the:",
      options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Plants use sunlight to make food in a process called:",
      options: ["Respiration", "Photosynthesis", "Digestion", "Fermentation"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Blood in humans is pumped by the:",
      options: ["Liver", "Kidney", "Heart", "Lungs"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Which blood vessels carry blood away from the heart?",
      options: ["Veins", "Capillaries", "Arteries", "Venules"],
      correctIndex: 2,
    },
    {
      difficulty: "hard",
      question: "DNA’s double helix was famously described by:",
      options: [
        "Darwin & Wallace",
        "Watson & Crick",
        "Pasteur & Koch",
        "Mendel & Morgan",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "The basic unit of life is the:",
      options: ["Tissue", "Organ", "Cell", "Organism"],
      correctIndex: 2,
    },
    {
      difficulty: "easy",
      question: "Humans breathe in mainly:",
      options: ["CO₂", "N₂ only", "O₂", "H₂"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Which organ removes urea from blood and makes urine?",
      options: ["Liver", "Stomach", "Kidney", "Pancreas"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Chlorophyll in plants is found mainly in:",
      options: ["Roots", "Stem cortex", "Leaves", "Flowers only"],
      correctIndex: 2,
    },
    {
      difficulty: "hard",
      question: "Meiosis produces cells with:",
      options: [
        "Same chromosome number as parent",
        "Half the chromosome number of parent",
        "Double the DNA always",
        "No genetic variation",
      ],
      correctIndex: 1,
    },
  ],
};

/** PCB stream (11th+): Physics, Chemistry, Biology. */
export const PCB_QUIZZES: Record<string, QuizQuestion[]> = {
  physics: [
    {
      difficulty: "easy",
      question: "Kinetic energy depends on mass and:",
      options: ["Volume", "Speed squared", "Color", "Density only"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Snell’s law relates angles in:",
      options: ["Thermodynamics", "Refraction", "Radioactivity", "Rotation"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "In a simple pendulum, for small angles, period is independent of:",
      options: ["Length", "Mass of bob", "g", "Amplitude (small)"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Capacitance in farads measures stored charge per:",
      options: ["Current", "Voltage", "Resistance", "Power"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "A convex lens can form a real inverted image when the object is:",
      options: [
        "At the focal point",
        "Between F and optical center",
        "Beyond 2F",
        "Always at any distance",
      ],
      correctIndex: 2,
    },
    {
      difficulty: "easy",
      question: "Work done by a conservative force is ___ for a closed path.",
      options: ["Positive", "Negative", "Zero", "Infinite"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Brewster’s angle relates to light at an interface when reflected light is:",
      options: [
        "Unpolarized",
        "Linearly polarized perpendicular to plane of incidence",
        "Circularly polarized always",
        "Absorbed fully",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Escape speed from Earth’s surface depends on planet ___ and radius.",
      options: ["Density only", "Mass", "Rotation only", "Albedo"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "For a satellite in circular orbit, centripetal acceleration equals:",
      options: ["g at surface", "v²/r", "GM only", "Zero"],
      correctIndex: 1,
    },
  ],
  chemistry: [
    {
      difficulty: "easy",
      question: "sp³ hybridization is typical of:",
      options: ["Ethyne", "Methane", "Ethene", "Benzene only"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "A catalyst mainly changes the:",
      options: [
        "Equilibrium constant",
        "Path of reaction / activation energy",
        "Final enthalpy only",
        "Number of moles of product",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "The order of a reaction is determined experimentally from:",
      options: [
        "Stoichiometric coefficients only",
        "Rate law",
        "Molecular mass",
        "Boiling point",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Which is a nucleophile?",
      options: ["BF₃", "NH₃", "AlCl₃", "SO₃"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "For a first-order reaction, half-life is:",
      options: [
        "Proportional to initial concentration",
        "Independent of initial concentration",
        "Proportional to concentration squared",
        "Zero",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Aromatic compounds often follow ___ substitution rules.",
      options: ["SN1 only", "Electrophilic aromatic", "Free radical only", "E2 only"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "The unit of rate constant for a second-order reaction (conc⁻¹ time⁻¹) depends on:",
      options: [
        "Only temperature",
        "Order and concentration units",
        "Catalyst color",
        "Pressure only",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Which has the highest boiling point among similar mass?",
      options: ["Branched alkane", "Straight-chain alkane", "Neopentane", "All equal always"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "In the Arrhenius equation, k increases when:",
      options: [
        "Activation energy increases",
        "Temperature decreases",
        "Temperature increases",
        "Only catalyst mass increases",
      ],
      correctIndex: 2,
    },
  ],
  biology: [
    {
      difficulty: "easy",
      question: "In DNA, adenine pairs with:",
      options: ["Cytosine", "Guanine", "Thymine", "Uracil"],
      correctIndex: 2,
    },
    {
      difficulty: "easy",
      question: "The light-dependent reactions of photosynthesis occur in:",
      options: ["Mitochondria", "Stroma", "Thylakoids", "Cytoplasm"],
      correctIndex: 2,
    },
    {
      difficulty: "medium",
      question: "Which enzyme joins Okazaki fragments on the lagging strand?",
      options: ["Helicase", "DNA ligase", "Primase", "Topoisomerase"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Hardy–Weinberg equilibrium assumes mainly:",
      options: [
        "Natural selection",
        "No mutation, migration, drift, selection",
        "Infinite population decrease",
        "Sexual selection only",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "In the Calvin cycle, CO₂ is fixed to form:",
      options: ["Glucose directly", "PGA / 3-PGA", "Pyruvate", "PEP"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "mRNA carries genetic information from DNA to:",
      options: ["Ribosomes", "Lysosomes", "Golgi", "Peroxisomes"],
      correctIndex: 0,
    },
    {
      difficulty: "easy",
      question: "The human kidney’s functional unit is the:",
      options: ["Alveolus", "Nephron", "Neuron", "Nodule"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Which blood group is universal donor (for red cells)?",
      options: ["AB+", "O−", "A+", "B+"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Insulin is secreted by ___ cells of the pancreas.",
      options: ["Alpha", "Beta", "Delta", "Acinar only"],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "PCR amplifies:",
      options: ["Proteins", "DNA", "Lipids", "Carbohydrates"],
      correctIndex: 1,
    },
  ],
};

/** PCM stream (11th+): Physics, Chemistry, Mathematics. */
export const PCM_QUIZZES: Record<string, QuizQuestion[]> = {
  physics: [
    {
      difficulty: "easy",
      question: "Magnetic field lines around a long straight current-carrying wire form:",
      options: ["Straight lines", "Circles", "Squares", "Hyperbolas"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "The SI unit of magnetic flux is:",
      options: ["Tesla", "Weber", "Henry", "Gauss"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Faraday’s law of electromagnetic induction relates to change in:",
      options: ["Charge only", "Magnetic flux", "Mass", "Pressure"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "In Young’s double-slit experiment, fringe width is proportional to:",
      options: [
        "Slit separation",
        "Wavelength / slit separation",
        "Slit separation / wavelength",
        "Inverse square of distance",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "A photon’s energy is proportional to:",
      options: ["Wavelength", "1 / wavelength (frequency)", "Amplitude² only", "Speed squared"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "The direction of induced current follows:",
      options: ["Ampere’s swimming rule", "Lenz’s law", "Biot–Savart only", "Coulomb’s law"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "de Broglie wavelength λ for a particle is h /:",
      options: ["E", "p (momentum)", "v²", "mc only"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "In a p-n junction, the depletion region has:",
      options: [
        "Mobile carriers only",
        "Fewer mobile carriers than bulk",
        "More carriers than bulk",
        "No electric field",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "For a diatomic ideal gas, Cp − Cv equals:",
      options: ["R", "2R", "R/2", "3R"],
      correctIndex: 0,
    },
  ],
  chemistry: [
    {
      difficulty: "easy",
      question: "Mole is defined by Avogadro’s number of:",
      options: ["Atoms only", "Entities (atoms/molecules/etc.)", "Electrons only", "Protons"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Ideal gas equation is PV =",
      options: ["nRT", "nR/T", "RT/n", "P/nRT"],
      correctIndex: 0,
    },
    {
      difficulty: "medium",
      question: "A buffer resists change in:",
      options: ["Volume", "pH", "Temperature only", "Density"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "The rate of a zero-order reaction depends on:",
      options: [
        "Concentration squared",
        "Concentration to the power zero",
        "ln(concentration)",
        "Temperature only",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "hard",
      question: "In the IUPAC name, the principal functional group gets the:",
      options: [
        "Lowest locant always",
        "Suffix according to priority rules",
        "Prefix only",
        "Middle number",
      ],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "Electronegativity generally ___ across a period (left to right).",
      options: ["Decreases", "Increases", "Stays constant", "Becomes zero"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "A diprotic acid can donate:",
      options: ["One proton", "Two protons", "Electrons only", "Neutrons"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Crystal field splitting in octahedral complexes splits d orbitals into:",
      options: ["Two sets (eg and t2g)", "One level", "Four equal levels", "No splitting"],
      correctIndex: 0,
    },
    {
      difficulty: "hard",
      question: "The Nernst equation relates cell potential to:",
      options: [
        "Only temperature",
        "Concentration (reaction quotient)",
        "Only pressure of solids",
        "Atomic mass only",
      ],
      correctIndex: 1,
    },
  ],
  mathematics: [
    {
      difficulty: "easy",
      question: "Derivative of sin(x) with respect to x is:",
      options: ["cos(x)", "-sin(x)", "-cos(x)", "tan(x)"],
      correctIndex: 0,
    },
    {
      difficulty: "easy",
      question: "∫ x dx equals:",
      options: ["x²/2 + C", "x + C", "x² + C", "1/x + C"],
      correctIndex: 0,
    },
    {
      difficulty: "medium",
      question: "If A is a 2×2 matrix with det(A) = 3, then det(2A) is:",
      options: ["6", "12", "24", "18"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "The sum of first n natural numbers is:",
      options: ["n(n+1)/2", "n²", "n(n-1)/2", "2n+1"],
      correctIndex: 0,
    },
    {
      difficulty: "hard",
      question: "For a complex number z = x + iy, |z| equals:",
      options: ["x + y", "√(x² + y²)", "x² + y²", "xy"],
      correctIndex: 1,
    },
    {
      difficulty: "easy",
      question: "lim (x→0) sin(x)/x equals:",
      options: ["0", "1", "∞", "−1"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "The derivative of ln(x) is:",
      options: ["x", "1/x", "ln(x)", "e^x"],
      correctIndex: 1,
    },
    {
      difficulty: "medium",
      question: "Number of ways to arrange the letters in “AAAB” is:",
      options: ["24", "12", "4", "6"],
      correctIndex: 2,
    },
    {
      difficulty: "hard",
      question: "If roots of x² − 5x + 6 = 0 are α and β, then α + β equals:",
      options: ["5", "6", "−5", "1"],
      correctIndex: 0,
    },
  ],
};

export function getQuizSubjects(
  grade: string,
  stream: "pcb" | "pcm" | undefined,
): { id: string; label: string; questions: QuizQuestion[] }[] {
  if (isGrade10OrBelow(grade)) {
    return [
      { id: "math", label: "Mathematics", questions: LOWER_QUIZZES.math },
      { id: "physics", label: "Physics", questions: LOWER_QUIZZES.physics },
      { id: "chemistry", label: "Chemistry", questions: LOWER_QUIZZES.chemistry },
      { id: "biology", label: "Biology", questions: LOWER_QUIZZES.biology },
    ];
  }
  if (stream === "pcb") {
    return [
      { id: "physics", label: "Physics", questions: PCB_QUIZZES.physics },
      { id: "chemistry", label: "Chemistry", questions: PCB_QUIZZES.chemistry },
      { id: "biology", label: "Biology", questions: PCB_QUIZZES.biology },
    ];
  }
  if (stream === "pcm") {
    return [
      { id: "physics", label: "Physics", questions: PCM_QUIZZES.physics },
      { id: "chemistry", label: "Chemistry", questions: PCM_QUIZZES.chemistry },
      { id: "mathematics", label: "Mathematics", questions: PCM_QUIZZES.mathematics },
    ];
  }
  return [];
}
