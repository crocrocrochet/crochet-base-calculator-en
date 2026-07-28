// ==============================
// 取得網頁元件
// ==============================

function sendAnalyticsEvent(eventName, parameters = {}) {
    if (typeof window.gtag === "function") {
        window.gtag("event", eventName, parameters);
    }
}
const patternSizeInput = document.getElementById("patternSize");
const patternCountInput = document.getElementById("patternCount");
const totalStitchesInput = document.getElementById("totalStitches");
const calculateButton = document.getElementById("calculateBtn");
const resultBox = document.getElementById("result");

calculateButton.addEventListener("click", function(){

    gtag("event","calculation_success",{

    pattern_size: patternSize,

    pattern_count: patternCount,

    total: totalStitches

});

    calculateStitches();

});

// ==============================
// 主計算函式
// ==============================

function calculateStitches() {
    const patternSizeText = patternSizeInput.value.trim();
    const patternCountText = patternCountInput.value.trim();
    const totalStitchesText = totalStitchesInput.value.trim();

    const filledFieldCount = [
        patternSizeText,
        patternCountText,
        totalStitchesText
    ].filter(value => value !== "").length;

    if (filledFieldCount !== 2) {
        showError("請在三個選項中，剛好填寫兩項。");
        return;
    }

    const patternSize = Number(patternSizeText);
    const patternCount = Number(patternCountText);
    const totalStitches = Number(totalStitchesText);

    const enteredValues = [
        patternSizeText === "" ? null : patternSize,
        patternCountText === "" ? null : patternCount,
        totalStitchesText === "" ? null : totalStitches
    ];

    const hasInvalidValue = enteredValues.some(value => {
        return (
            value !== null &&
            (!Number.isInteger(value) || value <= 0)
        );
    });

    if (hasInvalidValue) {
        showError("請輸入大於 0 的整數，不可輸入小數、負數或 0。");
        return;
    }

    let finalPatternSize;
    let requestedTotal;

    // 情況一：花樣針數＋花樣組數
    if (patternSizeText !== "" && patternCountText !== "") {
        finalPatternSize = patternSize;
        requestedTotal = patternSize * patternCount;

        totalStitchesInput.value = requestedTotal;
    }

    // 情況二：花樣針數＋總針數
    if (patternSizeText !== "" && totalStitchesText !== "") {
        finalPatternSize = patternSize;
        requestedTotal = totalStitches;

        if (totalStitches % patternSize === 0) {
            patternCountInput.value =
                totalStitches / patternSize;
        }
    }

    // 情況三：花樣組數＋總針數
    if (patternCountText !== "" && totalStitchesText !== "") {
        if (totalStitches % patternCount !== 0) {
            showPatternSizeAdjustment(
                patternCount,
                totalStitches
            );
            return;
        }

        finalPatternSize =
            totalStitches / patternCount;

        requestedTotal = totalStitches;
        patternSizeInput.value = finalPatternSize;
    }

    const ovalResult = generateOvalPlans(
        finalPatternSize,
        requestedTotal
    );

    const circleSix = generateCirclePlan(
        finalPatternSize,
        requestedTotal,
        6
    );

    const circleEight = generateCirclePlan(
        finalPatternSize,
        requestedTotal,
        8
    );

    const squarePlan = generateSquarePlan(
        finalPatternSize,
        requestedTotal
    );

    displayAllPlans({
    patternSize: finalPatternSize,
    requestedTotal,
    recommendedOvals: ovalResult.recommended,
    sameStitchOvals: ovalResult.same,
    fewerStitchOvals: ovalResult.fewer,
    moreStitchOvals: ovalResult.more,
    circles: [circleSix, circleEight],
    square: squarePlan
});
}


// ==============================
// 橢圓方案
// 公式：2x＋6n＝總針數
// 起針數＝x＋2
// ==============================

function generateOvalPlans(patternSize, requestedTotal) {
    const compatibleStep = leastCommonMultiple(
        patternSize,
        2
    );

    const candidateTotals = getNearbyCompatibleTotals(
        requestedTotal,
        compatibleStep
    );

    let allPlans = [];

    candidateTotals.forEach(total => {
        const maxRounds = Math.floor(total / 6);

        for (let rounds = 1; rounds <= maxRounds; rounds++) {
            const remainingStitches =
                total - (6 * rounds);

            if (remainingStitches < 0) {
                continue;
            }

            if (remainingStitches % 2 !== 0) {
                continue;
            }

            const straightSection =
                remainingStitches / 2;

            const startingChains =
                straightSection + 2;

            const roundTotals = [];

            for (
                let currentRound = 1;
                currentRound <= rounds;
                currentRound++
            ) {
                roundTotals.push(
                    (2 * straightSection) +
                    (6 * currentRound)
                );
            }

            allPlans.push({
                shape: "oval",
                startingType: "chain",
startingStitches: startingChains,
                startingStitches: startingChains,
                rounds,
                total,
                roundTotals,
                patternCount: total / patternSize,
                maxRounds,
                descriptionKey:
    describeOvalShape(
        rounds,
        maxRounds
    ),
                adjusted: total !== requestedTotal
            });
        }
    });

    allPlans.sort((a, b) => {
        const totalDifferenceA =
            Math.abs(a.total - requestedTotal);

        const totalDifferenceB =
            Math.abs(b.total - requestedTotal);

        if (totalDifferenceA !== totalDifferenceB) {
            return totalDifferenceA - totalDifferenceB;
        }

        return a.rounds - b.rounds;
    });

    if (allPlans.length === 0) {
    return {
        recommended: [],
        same: [],
        fewer: [],
        more: []
    };
}

    const overallMaxRounds = Math.max(
        ...allPlans.map(plan => plan.rounds)
    );

    const longTarget =
        overallMaxRounds * 0.25;

    const roundedTarget =
        overallMaxRounds * 0.75;

    /*
      依目前確認的規則：
      標準橢圓以最大可行圈數 X 附近為目標。
    */
    const standardTarget =
        overallMaxRounds * 0.5;

    const selectedPlans = [];

    const longPlan = findNearestDistinctPlan(
        allPlans,
        longTarget,
        selectedPlans,
        requestedTotal
    );

    if (longPlan) {
        longPlan.recommendationLabel = "偏長橢圓";
        selectedPlans.push(longPlan);
    }

    const standardPlan = findNearestDistinctPlan(
        allPlans,
        standardTarget,
        selectedPlans,
        requestedTotal
    );

    if (standardPlan) {
        standardPlan.recommendationLabel = "標準橢圓";
        selectedPlans.push(standardPlan);
    }

    const roundedPlan = findNearestDistinctPlan(
        allPlans,
        roundedTarget,
        selectedPlans,
        requestedTotal
    );

    if (roundedPlan) {
        roundedPlan.recommendationLabel = "偏圓橢圓";
        selectedPlans.push(roundedPlan);
    }

    const selectedKeys = new Set(
        selectedPlans.map(plan => getPlanKey(plan))
    );

    const otherPlans = allPlans.filter(plan => {
        return !selectedKeys.has(getPlanKey(plan));
    });

    const fewerStitchPlans = otherPlans.filter(plan => {
    return plan.total < requestedTotal;
});

const moreStitchPlans = otherPlans.filter(plan => {
    return plan.total > requestedTotal;
});

const sameStitchPlans = otherPlans.filter(plan => {
    return plan.total === requestedTotal;
});

return {
    recommended: selectedPlans,
    fewer: fewerStitchPlans,
    more: moreStitchPlans,
    same: sameStitchPlans
};
}


function findNearestDistinctPlan(
    plans,
    targetRounds,
    selectedPlans,
    requestedTotal
) {
    const selectedKeys = new Set(
        selectedPlans.map(plan => getPlanKey(plan))
    );

    const availablePlans = plans.filter(plan => {
        return !selectedKeys.has(getPlanKey(plan));
    });

    availablePlans.sort((a, b) => {
        const roundDifferenceA =
            Math.abs(a.rounds - targetRounds);

        const roundDifferenceB =
            Math.abs(b.rounds - targetRounds);

        if (roundDifferenceA !== roundDifferenceB) {
            return roundDifferenceA - roundDifferenceB;
        }

        const totalDifferenceA =
            Math.abs(a.total - requestedTotal);

        const totalDifferenceB =
            Math.abs(b.total - requestedTotal);

        if (totalDifferenceA !== totalDifferenceB) {
            return totalDifferenceA - totalDifferenceB;
        }

        return a.startingStitches -
            b.startingStitches;
    });

    return availablePlans[0] || null;
}


function describeOvalShape(rounds, maxRounds) {
    const ratio = rounds / maxRounds;

    if (ratio <= 0.25) {
        return "slenderOval";
    }

    if (ratio <= 0.5) {
        return "moderatelyLongOval";
    }

    if (ratio <= 0.75) {
        return "softlyRoundedOval";
    }

    return "nearRoundOval";
}


// ==============================
// 圓形方案
// 環起 6：每圈加 6
// 環起 8：每圈加 8
// ==============================

function generateCirclePlan(
    patternSize,
    requestedTotal,
    increasePerRound
) {
    const compatibleStep = leastCommonMultiple(
        patternSize,
        increasePerRound
    );

    const total = getNearestCompatibleTotal(
        requestedTotal,
        compatibleStep
    );

    const rounds =
        total / increasePerRound;

    const roundTotals = [];

    for (
        let currentRound = 1;
        currentRound <= rounds;
        currentRound++
    ) {
        roundTotals.push(
            increasePerRound * currentRound
        );
    }

    return {
        shape: "circle",
        label:
            `環起 ${increasePerRound} 針版本`,
        startingType: "magicRing",
startingStitches: increasePerRound,
        startingStitches: increasePerRound,
        rounds,
        total,
        roundTotals,
        patternCount: total / patternSize,
        adjusted: total !== requestedTotal
    };
}


// ==============================
// 方形方案
//
// 第1圈：8
// 第2圈：16
// 第3圈：32
// 第4圈：48
// 第2圈之後，每圈＋16
//
// 公式：
// 第1圈固定為 8 針
// 第2圈起：總針數 = 16 ×（圈數 - 1）
//
// 計算角落鎖針
// ==============================

function generateSquarePlan(
    patternSize,
    requestedTotal
) {
    const candidates = [];

    const maximumSearchTotal =
        requestedTotal + 5000;

    for (
        let rounds = 1;
        rounds <= 1000;
        rounds++
    ) {
        const total =
            getSquareTotalByRound(rounds);

        if (total > maximumSearchTotal) {
            break;
        }

        if (total % patternSize === 0) {
            candidates.push({
                rounds,
                total
            });
        }
    }

    if (candidates.length === 0) {
        return null;
    }

    candidates.sort((a, b) => {
        const differenceA =
            Math.abs(a.total - requestedTotal);

        const differenceB =
            Math.abs(b.total - requestedTotal);

        if (differenceA !== differenceB) {
            return differenceA - differenceB;
        }

        return a.total - b.total;
    });

    const chosen = candidates[0];

    const roundTotals = [];

    for (
        let currentRound = 1;
        currentRound <= chosen.rounds;
        currentRound++
    ) {
        roundTotals.push(
            getSquareTotalByRound(currentRound)
        );
    }

    return {
        shape: "square",
        label: "方形包底",
        startingType: "magicRing",
startingStitches: 8,
        startingStitches: 8,
        rounds: chosen.rounds,
        total: chosen.total,
        roundTotals,
        patternCount:
            chosen.total / patternSize,
        adjusted:
            chosen.total !== requestedTotal
    };
}


function getSquareTotalByRound(rounds) {
    // 第 1 圈固定為 8 針
    if (rounds === 1) {
        return 8;
    }

    // 第 2 圈起，每圈比上一圈增加 16 針
    return 16 * (rounds - 1);
}


// ==============================
// 顯示完整結果
// ==============================

function displayAllPlans(data) {
    const {
        patternSize,
        requestedTotal,
        recommendedOvals = [],
        sameStitchOvals = [],
        fewerStitchOvals = [],
        moreStitchOvals = [],
        circles = [],
        square = null
    } = data;

    const standardOval = recommendedOvals.find(plan =>
        plan.recommendationLabel === "標準橢圓"
    );

    const longOval = recommendedOvals.find(plan =>
        plan.recommendationLabel === "偏長橢圓"
    );

    const roundedOval = recommendedOvals.find(plan =>
        plan.recommendationLabel === "偏圓橢圓"
    );

    let html = `
        <div class="result-summary">
            <div class="summary-title">
    ${translate("settings")}
</div>

            <div class="summary-row">
                <span>${translate("singlePattern")}</span>
                <strong>${patternSize} ${translate("stitchUnit")}</strong>
            </div>

            <div class="summary-row">
                <span>${translate("enteredApproxTotal")}</span>
                <strong>${requestedTotal} ${translate("stitchUnit")}</strong>
            </div>
        </div>

        <section class="recommended-section">
            <h2 class="main-section-title">
    ${getTranslation("recommended") || "Recommended package"}
</h2>
    `;

    if (standardOval) {
        html += `
            <div class="featured-plan">
                ${createPlanCard(
    standardOval,
    translate("standardOval"),
    false,
    "standard-card",
    requestedTotal
)}
            </div>
        `;
    }

    html += `<div class="two-column-plans">`;

    if (longOval) {
        html += createPlanCard(
    longOval,
    translate("longOval"),
    false,
    "recommended-card",
    requestedTotal
);
    }

    if (roundedOval) {
        html += createPlanCard(
    roundedOval,
    translate("roundedOval"),
    false,
    "recommended-card",
    requestedTotal
);
    }

    html += `</div>`;

    html += `<div class="two-column-plans">`;

    if (circles[0]) {
        html += createPlanCard(
    circles[0],
    translate("circleOne"),
    false,
    "circle-card",
    requestedTotal
);
    }

    if (circles[1]) {
        html += createPlanCard(
    circles[1],
    translate("circleTwo"),
    false,
    "circle-card",
    requestedTotal
);
    }

    html += `</div>`;

    if (square) {
        html += `
            <div class="featured-plan">
                ${createPlanCard(
    square,
    translate("square"),
    false,
    "square-card",
    requestedTotal
)}
            </div>
        `;
    }

    html += `
        </section>

        <section class="other-section">
            <h2 class="main-section-title">
    ${getTranslation("other") || "其他方案"}
</h2>
    `;

    html += createPlanGroup(
    translate("sameTotalPlans"),
    sameStitchOvals,
    "same-oval-card",
    translate("noSameTotalPlans"),
    requestedTotal,
    0
);

    html += createPlanGroup(
    translate("fewerStitchPlans"),
    fewerStitchOvals,
    "fewer-oval-card",
    translate("noFewerStitchPlans"),
    requestedTotal,
    sameStitchOvals.length
);

    html += createPlanGroup(
    translate("moreStitchPlans"),
    moreStitchOvals,
    "more-oval-card",
    translate("noMoreStitchPlans"),
    requestedTotal,
    sameStitchOvals.length +
        fewerStitchOvals.length
);

    html += `
        </section>

        <div class="result-note">
            * 代表實際總針數與原設定不同，系統已調整至可完整配合花樣及包底公式的針數。
        </div>
    `;

    resultBox.className = "plans-result";
    resultBox.innerHTML = html;
}

sendAnalyticsEvent("calculation_success");

function createPlanGroup(
    groupTitle,
    plans,
    cardClass,
    emptyMessage,
    requestedTotal,
    startingIndex = 0
) {
    let html = `
        <div class="other-plan-group">
            <h3 class="group-title">${groupTitle}</h3>
    `;

    if (!plans || plans.length === 0) {
        html += `
            <div class="empty-plan-message">
                ${emptyMessage}
            </div>
        `;
    } else {
        html += `<div class="other-plan-grid">`;

        plans.forEach((plan, index) => {
    const planNumber =
        startingIndex + index + 1;

    const planDescription =
    plan.descriptionKey
        ? translate(plan.descriptionKey)
        : groupTitle;

const numberedTitle =
    `${formatPlanNumber(planNumber)} ${planDescription}`;

    html += createPlanCard(
        plan,
        numberedTitle,
        false,
        cardClass,
        requestedTotal
    );
});

        html += `</div>`;
    }

    html += `</div>`;

    return html;
}

function formatPlanNumber(number) {
    if (currentLanguage === "en") {
        return `${number}.`;
    }

    return `（${convertToChineseNumber(number)}）`;
}

function convertToChineseNumber(number) {
    const chineseDigits = [
        "零",
        "一",
        "二",
        "三",
        "四",
        "五",
        "六",
        "七",
        "八",
        "九"
    ];

    if (number < 10) {
        return chineseDigits[number];
    }

    if (number === 10) {
        return "十";
    }

    if (number < 20) {
        return `十${chineseDigits[number - 10]}`;
    }

    if (number < 100) {
        const tens =
            Math.floor(number / 10);

        const units =
            number % 10;

        return units === 0
            ? `${chineseDigits[tens]}十`
            : `${chineseDigits[tens]}十${chineseDigits[units]}`;
    }

    return String(number);
}

function formatStartingMethod(plan) {
    if (plan.startingType === "chain") {
        if (currentLanguage === "en") {
            return `${translate("chainStart")} ${plan.startingStitches} ${translate("stitchUnit")}`;
        }

        return `${translate("chainStart")} ${plan.startingStitches} ${translate("stitchUnit")}`;
    }

    if (plan.startingType === "magicRing") {
        if (currentLanguage === "en") {
            return `${translate("magicRingStart")} with ${plan.startingStitches} ${translate("stitchUnit")}`;
        }

        return `${translate("magicRingStart")} ${plan.startingStitches} ${translate("stitchUnit")}`;
    }

    return "";
}

function createPlanCard(
    plan,
    title,
    showShapeDescription = false,
    extraClass = "",
    requestedTotal = null
) {
    
    const totalIsMatched =
    requestedTotal !== null &&
    plan.total === requestedTotal;

const totalStatusClass =
    totalIsMatched
        ? "total-matched"
        : "total-adjusted";

const totalMark =
    totalIsMatched ? "" : "*";

    const descriptionHtml =
        showShapeDescription && translate(plan.descriptionKey)
            ? `
                <div class="plan-shape-description">
                    ${translate(plan.descriptionKey)}
                </div>
            `
            : "";

    return `
        <article class="plan-card ${extraClass}">
            <div class="plan-card-title">
                ${title}
            </div>

            <div class="plan-card-body">
                ${descriptionHtml}

                <div class="plan-info-grid">
    <div class="plan-info-row">
        <span class="plan-label">
    ${translate("startingMethod")}
</span>
        <span class="plan-value starting-method-value">
            ${formatStartingMethod(plan)}
        </span>
    </div>

    <div class="plan-info-row">
        <span class="plan-label">
    ${translate("rounds")}
</span>
        <span class="plan-value">
            ${plan.rounds} ${translate("roundUnit")}
        </span>
    </div>

<div class="plan-info-row">
    <span class="plan-label">
    ${translate("correctedTotal")}
</span>

    <span class="plan-value total-stitch-value ${totalStatusClass}">
        ${plan.total} ${translate("stitchUnit")}${totalMark}
    </span>
</div>

    <div class="plan-info-row">
        <span class="plan-label">
    ${translate("patternRepeats")}
</span>
        <span class="plan-value">
            ${plan.patternCount} ${translate("repeatUnit")}
        </span>
    </div>
</div>

                <div class="round-total-title">
    ${translate("stitchesPerRound")}
</div>

                <div class="round-total-list">
                    ${createRoundList(plan.roundTotals)}
                </div>
            </div>
        </article>
    `;
}


function createRoundList(roundTotals = []) {
    return roundTotals
        .map((total, index) => {
            return `
                <div class="round-total-item">
                    <span>
                        ${translate("roundLabel", {
                            number: index + 1
                        })}
                    </span>

                    <strong>
                        ${total} ${translate("stitchUnit")}
                    </strong>
                </div>
            `;
        })
        .join("");
}


// ==============================
// 花樣組數＋總針數不能整除時
// ==============================

function showPatternSizeAdjustment(
    patternCount,
    totalStitches
) {
    const smallerSize = Math.floor(
        totalStitches / patternCount
    );

    const largerSize = Math.ceil(
        totalStitches / patternCount
    );

    const smallerTotal =
        smallerSize * patternCount;

    const largerTotal =
        largerSize * patternCount;

    showAdjustment(`
        <strong>無法取得整數花樣針數</strong><br><br>

        ${totalStitches} 針不能完整分成
        ${patternCount} 組。<br><br>

        <strong>較小方案</strong><br>
        ${smallerSize} 針 ×
        ${patternCount} 組
        ＝ ${smallerTotal} 針<br><br>

        <strong>較大方案</strong><br>
        ${largerSize} 針 ×
        ${patternCount} 組
        ＝ ${largerTotal} 針
    `);
}


// ==============================
// 共用計算工具
// ==============================

function getNearbyCompatibleTotals(
    requestedTotal,
    step
) {
    if (requestedTotal % step === 0) {
        return [requestedTotal];
    }

    const smallerTotal =
        Math.floor(requestedTotal / step) * step;

    const largerTotal =
        Math.ceil(requestedTotal / step) * step;

    const totals = [];

    if (smallerTotal > 0) {
        totals.push(smallerTotal);
    }

    if (
        largerTotal > 0 &&
        largerTotal !== smallerTotal
    ) {
        totals.push(largerTotal);
    }

    return totals;
}


function getNearestCompatibleTotal(
    requestedTotal,
    step
) {
    if (requestedTotal % step === 0) {
        return requestedTotal;
    }

    const smallerTotal =
        Math.floor(requestedTotal / step) * step;

    const largerTotal =
        Math.ceil(requestedTotal / step) * step;

    if (smallerTotal <= 0) {
        return largerTotal;
    }

    const smallerDifference =
        requestedTotal - smallerTotal;

    const largerDifference =
        largerTotal - requestedTotal;

    /*
      距離相同時，優先採用較小方案。
    */
    if (smallerDifference <= largerDifference) {
        return smallerTotal;
    }

    return largerTotal;
}


function greatestCommonDivisor(a, b) {
    let first = Math.abs(a);
    let second = Math.abs(b);

    while (second !== 0) {
        const remainder = first % second;
        first = second;
        second = remainder;
    }

    return first;
}


function leastCommonMultiple(a, b) {
    return Math.abs(
        (a * b) /
        greatestCommonDivisor(a, b)
    );
}


function getPlanKey(plan) {
    return [
        plan.shape,
        plan.total,
        plan.rounds,
        plan.startingStitches
    ].join("-");
}


// ==============================
// 顯示訊息
// ==============================

function showError(message) {
    resultBox.className = "error";
    resultBox.textContent = message;
}


function showAdjustment(message) {
    resultBox.className = "adjustment";
    resultBox.innerHTML = message;
}



// ==============================
// 語言切換
// ==============================



const currentLanguage = "en";

function getTranslation(key) {
    return (
        translations[currentLanguage]?.[key] ??
        translations.zh?.[key] ??
        null
    );
}

function translate(key, variables = {}) {
    let text =
        translations[currentLanguage]?.[key] ??
        translations.zh?.[key] ??
        key;

    Object.entries(variables).forEach(([name, value]) => {
        text = text.replaceAll(
            `{${name}}`,
            String(value)
        );
    });

    return text;
}

document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});


// ==============================
// 加針規律面板控制
// ==============================

document.addEventListener("DOMContentLoaded", function () {
    const ruleButtons = document.querySelectorAll(
        ".rule-button[data-rule-target]"
    );

    const rulePanels = document.querySelectorAll(".rule-panel");

    const closeButtons = document.querySelectorAll(
        ".rule-close-button"
    );

    function closeAllRulePanels() {
        rulePanels.forEach(function (panel) {
            panel.hidden = true;
        });

        ruleButtons.forEach(function (button) {
            button.classList.remove("is-active");
            button.setAttribute("aria-expanded", "false");
        });
    }

    ruleButtons.forEach(function (button) {
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", function () {
            const targetId = button.dataset.ruleTarget;
            const targetPanel = document.getElementById(targetId);

            if (!targetPanel) {
                console.error(
                    "找不到規律面板：",
                    targetId
                );
                return;
            }

            const wasOpen = !targetPanel.hidden;

            closeAllRulePanels();

            if (!wasOpen) {
                targetPanel.hidden = false;
                button.classList.add("is-active");
                button.setAttribute("aria-expanded", "true");

                if (targetId === "ovalRulePanel") {
    sendAnalyticsEvent("open_oval_rule");
}

if (targetId === "squareRulePanel") {
    sendAnalyticsEvent("open_square_rule");
}
                targetPanel.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });

    closeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            closeAllRulePanels();
        });
    });
});