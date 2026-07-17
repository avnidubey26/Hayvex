export interface OcrWordConfidence {
    text: string;
    confidence: number;
}

export interface RawOcrResult {
    text: string;
    overallConfidence: number;
    words: OcrWordConfidence[];
}

interface OcrMetrics {
    normalizedText: string;

    words: string[];

    cleanedWords: string[];

    characterCount: number;

    wordCount: number;

    averageWordConfidence: number;

    overallConfidence: number;

    letterCount: number;

    digitCount: number;

    symbolCount: number;

    whitespaceCount: number;

    meaningfulWordRatio: number;

    randomWordRatio: number;

    repeatedCharacterRatio: number;

    repeatedWordRatio: number;

    symbolRatio: number;

    digitRatio: number;

    uppercaseRatio: number;

    averageWordLength: number;
}

interface ValidationScores {
    confidence: number;

    language: number;

    structure: number;

    garbage: number;

    final: number;
}

/* ============================================================
   Thresholds
============================================================ */

const MIN_TEXT_LENGTH = 3;

const MIN_WORD_COUNT = 1;

const MIN_OVERALL_CONFIDENCE = 45;

const MIN_AVERAGE_WORD_CONFIDENCE = 50;

const MIN_FINAL_SCORE = 65;

const MAX_SYMBOL_RATIO = 0.25;

const MAX_RANDOM_WORD_RATIO = 0.55;

const MAX_REPEATED_CHARACTER_RATIO = 0.18;

const MAX_REPEATED_WORD_RATIO = 0.45;


/* ============================================================
   Common Words
============================================================ */

const COMMON_SHORT_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "do",
    "for",
    "from",
    "go",
    "has",
    "he",
    "if",
    "in",
    "is",
    "it",
    "me",
    "my",
    "no",
    "of",
    "on",
    "or",
    "so",
    "the",
    "to",
    "up",
    "we",
    "you",
]);

/* ============================================================
   Utility Functions
============================================================ */

function clamp(
    value: number,
    min = 0,
    max = 100,
): number {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

function ratio(
    value: number,
    total: number,
): number {
    if (total <= 0) {
        return 0;
    }

    return value / total;
}

function average(
    values: number[],
): number {
    if (values.length === 0) {
        return 0;
    }

    let total = 0;

    for (const value of values) {
        total += value;
    }

    return total / values.length;
}

function tokenize(
    text: string,
): string[] {
    return text
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean);
}

function normalizeWord(
    word: string,
): string {
    return word
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function onlyLetters(
    text: string,
): string {
    return text.replace(
        /[^a-z]/gi,
        "",
    );
}

function countMatches(
    text: string,
    regex: RegExp,
): number {
    const matches =
        text.match(regex);

    return matches
        ? matches.length
        : 0;
}

function averageWordConfidence(
    words: OcrWordConfidence[],
    overallConfidence: number,
): number {
    if (words.length === 0) {
        return clamp(overallConfidence);
    }

    let total = 0;

    for (const word of words) {
        total += word.confidence;
    }

    return total / words.length;
}

function normalizeText(
    text: string,
): string {
    return text
        .normalize("NFKC")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[‐-‒–—]/g, "-")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u00A0/g, " ")
        .trim();
}

function normalizeWords(
    words: OcrWordConfidence[],
): OcrWordConfidence[] {
    return words
        .map((word) => ({
            text: normalizeWord(word.text),
            confidence: clamp(
                word.confidence,
            ),
        }))
        .filter(
            (word) => word.text.length > 0,
        );
}

function countRepeatedCharacters(
    text: string,
): number {
    if (text.length === 0) {
        return 0;
    }

    let repeated = 0;

    let run = 1;

    for (
        let i = 1;
        i < text.length;
        i++
    ) {
        if (text[i] === text[i - 1]) {
            run++;
        } else {
            if (run >= 3) {
                repeated += run;
            }

            run = 1;
        }
    }

    if (run >= 3) {
        repeated += run;
    }

    return repeated;
}

function repeatedWordRatio(
    words: string[],
): number {
    if (words.length === 0) {
        return 0;
    }

    const counts = new Map<
        string,
        number
    >();

    for (const word of words) {
        counts.set(
            word,
            (counts.get(word) ?? 0) + 1,
        );
    }

    let highest = 0;

    for (const count of counts.values()) {
        highest = Math.max(
            highest,
            count,
        );
    }

    return ratio(
        highest,
        words.length,
    );
}


function looksRandom(
    word: string,
): boolean {
    if (
        COMMON_SHORT_WORDS.has(word)
    ) {
        return false;
    }

    if (word.length <= 2) {
        return false;
    }

    if (/^\d+$/.test(word)) {
        return false;
    }

    const letters =
        onlyLetters(word);

    if (letters.length < 3) {
        return false;
    }

    const vowels =
        countMatches(
            letters,
            /[aeiou]/gi,
        );

    if (vowels === 0) {
        return true;
    }

    if (
        vowels / letters.length <
        0.20
    ) {
        return true;
    }

    if (
        /([bcdfghjklmnpqrstvwxyz]{5,})/i.test(
            letters,
        )
    ) {
        return true;
    }

    return false;
}
function calculateMetrics(
    raw: RawOcrResult,
): OcrMetrics {
    const normalizedText =
        normalizeText(raw.text);

    const words =
        tokenize(normalizedText);

    const cleanedWords =
        words.map(normalizeWord);

    const normalizedWordData =
        normalizeWords(raw.words);

    const characterCount =
        normalizedText.length;

    const wordCount =
        words.length;

    const letterCount =
        countMatches(
            normalizedText,
            /[A-Za-z]/g,
        );

    const digitCount =
        countMatches(
            normalizedText,
            /\d/g,
        );

    const symbolCount =
        countMatches(
            normalizedText,
            /[^A-Za-z0-9\s]/g,
        );

    const whitespaceCount =
        countMatches(
            normalizedText,
            /\s/g,
        );

    let meaningfulWords = 0;
    let randomWords = 0;

    for (const word of cleanedWords) {
        if (!word) {
            continue;
        }

        if (looksRandom(word)) {
            randomWords++;
        } else {
            meaningfulWords++;
        }
    }

    const repeatedCharacters =
        countRepeatedCharacters(
            normalizedText,
        );

    const averageLength =
        average(
            cleanedWords
                .filter(
                    (word) =>
                        word.length > 0,
                )
                .map(
                    (word) =>
                        word.length,
                ),
        );

    const uppercaseLetters =
        countMatches(
            normalizedText,
            /[A-Z]/g,
        );

    return {
        normalizedText,

        words,

        cleanedWords,

        characterCount,

        wordCount,

        averageWordConfidence:
            averageWordConfidence(
                normalizedWordData,
                raw.overallConfidence,
            ),

        overallConfidence:
            clamp(
                raw.overallConfidence,
            ),

        letterCount,

        digitCount,

        symbolCount,

        whitespaceCount,

        meaningfulWordRatio:
            ratio(
                meaningfulWords,
                Math.max(
                    cleanedWords.length,
                    1,
                ),
            ),

        randomWordRatio:
            ratio(
                randomWords,
                Math.max(
                    cleanedWords.length,
                    1,
                ),
            ),

        repeatedCharacterRatio:
            ratio(
                repeatedCharacters,
                Math.max(
                    characterCount,
                    1,
                ),
            ),

        repeatedWordRatio:
            repeatedWordRatio(
                cleanedWords,
            ),

        symbolRatio:
            ratio(
                symbolCount,
                Math.max(
                    characterCount,
                    1,
                ),
            ),

        digitRatio:
            ratio(
                digitCount,
                Math.max(
                    characterCount,
                    1,
                ),
            ),

        uppercaseRatio:
            ratio(
                uppercaseLetters,
                Math.max(
                    letterCount,
                    1,
                ),
            ),

        averageWordLength:
            averageLength,
    };
} function calculateConfidenceScore(
    metrics: OcrMetrics,
): number {
    let score = 100;

    if (
        metrics.overallConfidence <
        MIN_OVERALL_CONFIDENCE
    ) {
        score -=
            (MIN_OVERALL_CONFIDENCE -
                metrics.overallConfidence) *
            1.5;
    }

    if (
        metrics.averageWordConfidence <
        MIN_AVERAGE_WORD_CONFIDENCE
    ) {
        score -=
            (MIN_AVERAGE_WORD_CONFIDENCE -
                metrics.averageWordConfidence) *
            1.2;
    }

    return clamp(score);
}

function calculateLanguageScore(
    metrics: OcrMetrics,
): number {
    let score = 100;

    score -=
        metrics.randomWordRatio * 100;

    if (
        metrics.averageWordLength <
        2.5
    ) {
        score -=
            (2.5 -
                metrics.averageWordLength) *
            12;
    }

    if (
        metrics.meaningfulWordRatio <
        0.5
    ) {
        score -=
            (0.5 -
                metrics.meaningfulWordRatio) *
            100;
    }

    return clamp(score);
}

function calculateStructureScore(
    metrics: OcrMetrics,
): number {
    let score = 100;

    if (
        metrics.characterCount <
        MIN_TEXT_LENGTH
    ) {
        score -= 60;
    }

    if (
        metrics.wordCount <
        MIN_WORD_COUNT
    ) {
        score -= 50;
    }

    if (
        metrics.symbolRatio >
        MAX_SYMBOL_RATIO
    ) {
        score -=
            (metrics.symbolRatio -
                MAX_SYMBOL_RATIO) *
            100;
    }

    if (
        metrics.repeatedWordRatio >
        MAX_REPEATED_WORD_RATIO
    ) {
        score -=
            (metrics.repeatedWordRatio -
                MAX_REPEATED_WORD_RATIO) *
            100;
    }

    return clamp(score);
}

function calculateGarbageScore(
    metrics: OcrMetrics,
): number {
    let score = 100;

    if (
        metrics.randomWordRatio >
        MAX_RANDOM_WORD_RATIO
    ) {
        score -=
            (metrics.randomWordRatio -
                MAX_RANDOM_WORD_RATIO) *
            100;
    }

    if (
        metrics.repeatedCharacterRatio >
        MAX_REPEATED_CHARACTER_RATIO
    ) {
        score -=
            (metrics.repeatedCharacterRatio -
                MAX_REPEATED_CHARACTER_RATIO) *
            100;
    }


    return clamp(score);
}

function calculateScores(
    metrics: OcrMetrics,
): ValidationScores {
    const confidence =
        calculateConfidenceScore(
            metrics,
        );

    const language =
        calculateLanguageScore(
            metrics,
        );

    const structure =
        calculateStructureScore(
            metrics,
        );

    const garbage =
        calculateGarbageScore(
            metrics,
        );

    const final =
        confidence * 0.35 +
        language * 0.30 +
        structure * 0.20 +
        garbage * 0.15;

    return {
        confidence,
        language,
        structure,
        garbage,
        final: clamp(final),
    };
}
function shouldReject(
    metrics: OcrMetrics,
    scores: ValidationScores,
): boolean {
    if (metrics.characterCount < MIN_TEXT_LENGTH) {
        console.log("Reject: characterCount");
        return true;
    }

    if (metrics.wordCount < MIN_WORD_COUNT) {
        console.log("Reject: wordCount");
        return true;
    }

    if (metrics.overallConfidence < MIN_OVERALL_CONFIDENCE) {
        console.log("Reject: overallConfidence");
        return true;
    }

    if (metrics.averageWordConfidence < MIN_AVERAGE_WORD_CONFIDENCE) {
        console.log(
            "Reject: averageWordConfidence",
            metrics.averageWordConfidence,
        );
        return true;
    }

    if (metrics.symbolRatio > MAX_SYMBOL_RATIO) {
        console.log("Reject: symbolRatio");
        return true;
    }

    if (metrics.randomWordRatio > MAX_RANDOM_WORD_RATIO) {
        console.log("Reject: randomWordRatio");
        return true;
    }

    if (
        metrics.repeatedCharacterRatio >
        MAX_REPEATED_CHARACTER_RATIO
    ) {
        console.log("Reject: repeatedCharacterRatio");
        return true;
    }

    if (
        metrics.repeatedWordRatio >
        MAX_REPEATED_WORD_RATIO
    ) {
        console.log("Reject: repeatedWordRatio");
        return true;
    }


    if (scores.final < MIN_FINAL_SCORE) {
        console.log("Reject: finalScore", scores.final);
        return true;
    }

    return false;
}

function finalizeText(
    text: string,
): string {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n")
        .trim();
}
export function evaluateOcrResult(
    raw: RawOcrResult,
): string {
    const metrics = calculateMetrics(raw);
    const scores = calculateScores(metrics);

    if (shouldReject(metrics, scores)) {
        return "";
    }

    return finalizeText(metrics.normalizedText);
}