const { keywordRiskRules: analysisKeywordRiskRules, measurementRules: analysisMeasurementRules } = window.AppData;


function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractMeasurements(text) {
  return analysisMeasurementRules
    .map((rule) => {
      const value = extractValueForRule(text, rule);
      if (value === null) {
        return null;
      }

      return {
        ...rule,
        value,
        status: evaluateStatus(rule, value)
      };
    })
    .filter(Boolean);
}

function buildMeasurementIssues(measurements) {
  return measurements
    .filter((measurement) => measurement.status !== "normal")
    .map((measurement) => {
      const directionText = measurement.status === "high" ? "higher" : "lower";

      return {
        id: measurement.id,
        severity: measurement.severity,
        weight: measurement.severity === "high" ? 14 : measurement.severity === "moderate" ? 10 : 6,
        name: measurement.issueTitle,
        improve: `${measurement.name} is ${directionText} than recommended range (${measurement.refRange}). ${measurement.improve}`,
        foods: measurement.foods,
        avoid: measurement.avoid
      };
    });
}

function buildKeywordIssues(text, measurementIssues) {
  return analysisKeywordRiskRules
    .filter((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
    .filter((rule) => !measurementIssues.some((issue) => issue.id === rule.id))
    .map((rule) => ({
      ...rule
    }));
}

function calculateScore(measurements, issues) {
  if (!measurements.length) {
    return 72;
  }

  const abnormalCount = measurements.filter((measurement) => measurement.status !== "normal").length;
  const severityPenalty = issues.reduce((sum, issue) => sum + issue.weight, 0);
  const keywordOnlyCount = Math.max(0, issues.length - abnormalCount);
  const abnormalRatioPenalty = (abnormalCount / measurements.length) * 26;
  const severityPenaltyScaled = severityPenalty / Math.max(3, measurements.length * 2.3);
  const missingDataPenalty = measurements.length < 3 ? 6 : measurements.length < 5 ? 3 : 0;
  const score = 94 - abnormalRatioPenalty - severityPenaltyScaled - keywordOnlyCount * 1.5 - missingDataPenalty;

  return Math.max(58, Math.min(98, Math.round(score)));
}

function extractValueForRule(text, rule) {
  if (rule.id === "systolic_bp") {
    const bpMatch = text.match(/(?:\bblood pressure\b|\bbp\b)[^\d]{0,16}(\d{2,3})\s*\/?\s*\d{2,3}/i);
    if (bpMatch) {
      return Number.parseFloat(bpMatch[1]);
    }
  }

  for (const alias of rule.aliases) {
    const aliasPattern = buildAliasPattern(alias);

    const afterAliasMatch = text.match(new RegExp(`${aliasPattern}[^\\d]{0,12}(\\d+(?:\\.\\d+)?)`, "i"));
    if (afterAliasMatch) {
      return Number.parseFloat(afterAliasMatch[1]);
    }

    const beforeAliasMatch = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[^a-zA-Z0-9]{0,4}${aliasPattern}`, "i"));
    if (beforeAliasMatch) {
      return Number.parseFloat(beforeAliasMatch[1]);
    }
  }

  return null;
}

function evaluateStatus(rule, value) {
  const rangeSpan = Math.max(1, rule.max - rule.min);
  const tolerance = rangeSpan * 0.05;

  if (value < rule.min - tolerance) {
    return "low";
  }

  if (value > rule.max + tolerance) {
    return "high";
  }

  return "normal";
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAliasPattern(alias) {
  const escapedAlias = escapeRegExp(alias);
  return `\\b${escapedAlias}\\b`;
}

window.AppAnalysis = {
  normalizeText,
  extractMeasurements,
  buildMeasurementIssues,
  buildKeywordIssues,
  calculateScore
};
