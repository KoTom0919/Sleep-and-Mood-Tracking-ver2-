document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = "sleepRecords";
    const SETTINGS_KEY = "conditionChecklistSettings";

        function legacyCategory(letter, saved) {
        return {
            id: `category-${letter}`,
            name: saved?.name || `カテゴリー${letter.toUpperCase()}`,
            items: Array.from({ length: 10 }, (_, index) => ({
                id: `${letter}${index + 1}`,
                name: saved?.items?.[index] || `項目${index + 1}`
            }))
        };
    }

    function readChecklistSettings() {
        let saved;
        try {
            saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        } catch (error) {
            console.error("設定を読み込めませんでした。", error);
        }

        if (Array.isArray(saved?.categories) &&
            Array.isArray(saved?.standaloneItems)) {
            return saved;
        }

        return {
            categories: [
                legacyCategory("a", saved?.categoryA),
                legacyCategory("b", saved?.categoryB)
            ],
            standaloneItems: []
        };
    }

    let checklistSettings = readChecklistSettings();
    const checklistContainer = document.querySelector(".condition-categories");

    function renderChecklist() {
        checklistContainer.replaceChildren();

        function appendGroup(name, items) {
            const section = document.createElement("section");
            section.className = "condition-category";

            const heading = document.createElement("h3");
            heading.textContent = name;

            const list = document.createElement("div");
            list.className = "condition-checklist";

            for (const item of items) {
                const label = document.createElement("label");
                label.className = "symptom-item";

                const text = document.createElement("span");
                text.textContent = item.name;

                const input = document.createElement("input");
                input.type = "checkbox";
                input.dataset.condition = item.id;

                label.append(text, input);
                list.append(label);
            }

            section.append(heading, list);
            checklistContainer.append(section);
        }

        for (const category of checklistSettings.categories) {
            if (!category.archived) appendGroup(category.name, category.items);
        }

        const standaloneItems = checklistSettings.standaloneItems.filter(
            item => !item.archived
        );
        if (standaloneItems.length) appendGroup("体調項目", standaloneItems);
    }

    function categoryScore(category, condition) {
        const hasRecord = category.items.some(
            item => Object.hasOwn(condition, item.id)
        );
        if (!hasRecord) return null;

        return category.items.filter(
            item => conditionIsChecked(condition[item.id])
        ).length;
    }

    renderChecklist();

    let records = readRecords();
    let selectedDate = formatDate(new Date());
    let selectedSatisfaction = null;
    let selectedMood = null;
    let messageTimer = null;

    let sleepChart = null;
    let moodChart = null;
    let satisfactionChart = null;
    let categoryChart = null;

    const recordPage = document.getElementById("record-page");
    const listPage = document.getElementById("list-page");
    const trendPage = document.getElementById("trend-page");

    const recordNavButton = document.getElementById("record-nav-button");
    const listNavButton = document.getElementById("list-nav-button");
    const trendNavButton = document.getElementById("trend-nav-button");

    const editDateButton = document.getElementById("edit-date-button");
    const editDateInput = document.getElementById("edit-date-input");
    const dateMenu = document.getElementById("date-menu");

    const bedtimeButton = document.getElementById("bedtime-button");
    const bedtimeMenu = document.getElementById("bedtime-menu");
    const bedtimeInput = document.getElementById("bedtime-input");

    const wakeTimeButton = document.getElementById("wake-time-button");
    const wakeTimeMenu = document.getElementById("wake-time-menu");
    const wakeTimeInput = document.getElementById("wake-time-input");

    const satisfactionButton = document.getElementById("satisfaction-button");
    const satisfactionMenu = document.getElementById("satisfaction-menu");
    const moodButton = document.getElementById("mood-button");
    const moodMenu = document.getElementById("mood-menu");

    let conditionInputs = [
        ...document.querySelectorAll("[data-condition]")
    ];

    const settingsButton = document.getElementById("settings-button");
    const settingsModal = document.getElementById("settings-modal");
    const settingsCancel = document.getElementById("settings-cancel");
    const settingsSave = document.getElementById("settings-save");

    const categoryAName = document.getElementById("category-a-name");
    const categoryBName = document.getElementById("category-b-name");
    const categoryASettings = document.getElementById("category-a-settings");
    const categoryBSettings = document.getElementById("category-b-settings");

    const memoInput = document.getElementById("memo-input");

    /* メモの文字表示と高さの自動調整 */
    function updateMemoLayout() {
        document.querySelector(".memo-section").classList.toggle(
            "has-memo",
            memoInput.value.length > 0
        );

        if (memoInput.clientWidth === 0) {
            return;
        }

        memoInput.style.height = "auto";

        const style = getComputedStyle(memoInput);
        const borders =
            parseFloat(style.borderTopWidth) +
            parseFloat(style.borderBottomWidth);

        memoInput.style.height =
            Math.max(120, memoInput.scrollHeight + borders) + "px";
    }

    memoInput.addEventListener("input", updateMemoLayout);
    window.addEventListener("resize", updateMemoLayout);

    if (typeof ResizeObserver !== "undefined") {
        let memoWidth = -1;

        new ResizeObserver(function () {
            const width = memoInput.clientWidth;

            if (width !== memoWidth) {
                memoWidth = width;
                updateMemoLayout();
            }
        }).observe(memoInput);
    }

    const saveButton = document.getElementById("save-button");
    const clearButton = document.getElementById("clear-button");
    const saveMessage = document.getElementById("save-message");
    const recordActionBar = document.getElementById("record-action-bar");

    const recordsTableBody = document.getElementById("records-table-body");
    const noRecordsMessage = document.getElementById("no-records-message");
    const listStartDate = document.getElementById("list-start-date");
    const listEndDate = document.getElementById("list-end-date");
    const updateListButton = document.getElementById("update-list-button");
    const printButton = document.getElementById("print-button");

    const trendStartDate = document.getElementById("trend-start-date");
    const trendEndDate = document.getElementById("trend-end-date");
    const updateTrendButton = document.getElementById("update-trend-button");
    const trendPrintButton = document.getElementById("trend-print-button");

    const sleepChartCanvas = document.getElementById("sleep-chart");
    const moodChartCanvas = document.getElementById("mood-chart");
    const satisfactionChartCanvas = document.getElementById("satisfaction-chart");
    const categoryChartCanvas = document.getElementById("category-chart");

    function readRecords() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            return savedData ? JSON.parse(savedData) : {};
        } catch (error) {
            console.error("記録を読み込めませんでした。", error);
            return {};
        }
    }

    function saveRecords() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
            return true;
        } catch (error) {
            console.error("記録を保存できませんでした。", error);
            showMessage("記録を保存できませんでした", "error");
            return false;
        }
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        const parts = value.split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function displayDate(value) {
        const date = parseDate(value);
        return (
            `${date.getFullYear()}年` +
            `${date.getMonth() + 1}月` +
            `${date.getDate()}日`
        );
    }

    function formatTableDate(value) {
        const date = parseDate(value);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}/${month}/${day}`;
    }

    function formatChartDate(value) {
        const date = parseDate(value);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    function changeSelectedDate(value) {
        if (!value) {
            return;
        }

        selectedDate = value;
        editDateButton.textContent = displayDate(value);
        editDateInput.value = value;

        loadSelectedRecord();
        hideMessage();
    }

    function moveDate(days) {
        const date = parseDate(selectedDate);
        date.setDate(date.getDate() + days);
        changeSelectedDate(formatDate(date));
    }

    function conditionIsChecked(value) {
        return value === true || value === "○" || value === "〇";
    }

    function loadSelectedRecord() {
        records = readRecords();
        const record = records[selectedDate] || {};

        bedtimeButton.textContent = record.bedtime || "○○：○○";
        bedtimeInput.value = record.bedtime || "";

        wakeTimeButton.textContent = record.wakeTime || "○○：○○";
        wakeTimeInput.value = record.wakeTime || "";

        selectedSatisfaction = record.sleepSatisfaction || null;
        satisfactionButton.textContent = selectedSatisfaction || "－";

        if (record.mood === 0 || record.mood) {
            selectedMood = String(record.mood);
        } else {
            selectedMood = null;
        }

        moodButton.textContent =
            selectedMood === null ? "－" : selectedMood;

        conditionInputs.forEach(function (input) {
            const conditionName = input.dataset.condition;
            const condition = record.condition || {};
            let value = condition[conditionName];

            if (
                conditionName === "irritation" &&
                value === undefined
            ) {
                value = condition.irritability;
            }

            input.checked = conditionIsChecked(value);
        });

        memoInput.value = record.memo || "";
        updateMemoLayout();
    }

    function getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    function openTimeMenu(menu, input, button) {
        const willOpen = menu.hidden;
        closeAllMenus();

        if (!willOpen) {
            return;
        }

        const displayedTime = button.textContent.trim();
        input.value = displayedTime === "○○：○○" ? "" : displayedTime;
        menu.hidden = false;
    }

    function confirmTime(menu, input, button) {
        const time = normalizeTimeInput(input.value);

        if (input.value.trim() !== "" && time === null) {
            showMessage(
                "時刻を00:00～23:59で入力してください",
                "error"
            );
            input.focus();
            return;
        }

        button.textContent = time || "○○：○○";
        input.value = time || "";
        menu.hidden = true;
        hideMessage();
    }

    function normalizeTimeInput(value) {
        const text = value
            .trim()
            .replace(/[０-９]/g, function (digit) {
                return String.fromCharCode(digit.charCodeAt(0) - 65248);
            })
            .replace(/：/g, ":");

        let hours;
        let minutes;

        if (/^\d{3,4}$/.test(text)) {
            hours = text.slice(0, -2);
            minutes = text.slice(-2);
        } else {
            const parts = text.match(/^(\d{1,2}):(\d{1,2})$/);

            if (!parts) {
                return null;
            }

            hours = parts[1];
            minutes = parts[2];
        }

        const hourNumber = Number(hours);
        const minuteNumber = Number(minutes);

        if (
            hourNumber < 0 ||
            hourNumber > 23 ||
            minuteNumber < 0 ||
            minuteNumber > 59
        ) {
            return null;
        }

        return (
            String(hourNumber).padStart(2, "0") +
            ":" +
            String(minuteNumber).padStart(2, "0")
        );
    }

    function closeAllMenus() {
        dateMenu.hidden = true;
        bedtimeMenu.hidden = true;
        wakeTimeMenu.hidden = true;
        satisfactionMenu.hidden = true;
        moodMenu.hidden = true;
    }

    function showMessage(message, type = "save") {
        window.clearTimeout(messageTimer);

        saveMessage.textContent = message;
        saveMessage.classList.toggle(
            "clear-message",
            type === "clear" || type === "error"
        );
        saveMessage.classList.add("show-message");

        messageTimer = window.setTimeout(hideMessage, 3000);
    }

    function hideMessage() {
        saveMessage.classList.remove("show-message");

        window.setTimeout(function () {
            if (!saveMessage.classList.contains("show-message")) {
                saveMessage.textContent = "";
                saveMessage.classList.remove("clear-message");
            }
        }, 250);
    }

    function saveRecord() {
        records = readRecords();

                const condition = { ...records[selectedDate]?.condition };
        conditionInputs.forEach(function (input) {
            condition[input.dataset.condition] =
                input.checked ? "○" : "";
        });

        let bedtime = bedtimeButton.textContent.trim();
        let wakeTime = wakeTimeButton.textContent.trim();

        if (bedtime === "○○：○○") {
            bedtime = null;
        }

        if (wakeTime === "○○：○○") {
            wakeTime = null;
        }

        const previousRecord = records[selectedDate] || {};

        records[selectedDate] = {
            ...previousRecord,
            bedtimeDate: bedtime ? selectedDate : null,
            bedtime: bedtime,
            wakeDate: wakeTime ? selectedDate : null,
            wakeTime: wakeTime,
            sleepSatisfaction: selectedSatisfaction,
            mood: selectedMood === null ? null : Number(selectedMood),
            condition: condition,
            memo: memoInput.value.trim()
        };

        if (saveRecords()) {
            showMessage("記録しました");
        }
    }

    function clearSelectedRecord() {
        records = readRecords();

        const dateText = displayDate(selectedDate);
        const hasSavedRecord = Object.prototype.hasOwnProperty.call(
            records,
            selectedDate
        );

        const confirmed = window.confirm(
            `${dateText}の記録を消去しますか？\n` +
            "この操作は元に戻せません。"
        );

        if (!confirmed) {
            return;
        }

        if (hasSavedRecord) {
            delete records[selectedDate];

            if (!saveRecords()) {
                return;
            }
        }

        loadSelectedRecord();
        closeAllMenus();

        showMessage(
            hasSavedRecord
                ? "記録を消去しました"
                : "入力内容をクリアしました",
            "clear"
        );
    }

    function calculateSleepMinutes(bedtime, wakeTime) {
        if (!bedtime || !wakeTime) {
            return null;
        }

        const bedtimeParts = bedtime.split(":").map(Number);
        const wakeTimeParts = wakeTime.split(":").map(Number);

        let bedtimeMinutes = bedtimeParts[0] * 60 + bedtimeParts[1];
        let wakeTimeMinutes = wakeTimeParts[0] * 60 + wakeTimeParts[1];

        if (wakeTimeMinutes < bedtimeMinutes) {
            wakeTimeMinutes += 24 * 60;
        }

        return wakeTimeMinutes - bedtimeMinutes;
    }

    function calculateSleepDuration(bedtime, wakeTime) {
        const totalMinutes = calculateSleepMinutes(bedtime, wakeTime);

        if (totalMinutes === null) {
            return "";
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}時間${String(minutes).padStart(2, "0")}分`;
    }

    function convertSleepTimeToHours(bedtime, wakeTime) {
        const sleepMinutes = calculateSleepMinutes(bedtime, wakeTime);

        if (sleepMinutes === null) {
            return null;
        }

        return Number((sleepMinutes / 60).toFixed(2));
    }

    function formatSleepHours(value) {
        if (value === null || value === undefined) {
            return "";
        }

        const totalMinutes = Math.round(value * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}時間${String(minutes).padStart(2, "0")}分`;
    }

    function getConditionMark(condition, name, oldName) {
        if (!condition) {
            return "";
        }

        let value = condition[name];

        if (value === undefined && oldName) {
            value = condition[oldName];
        }

        return conditionIsChecked(value) ? "○" : "";
    }

    function createTableCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value ?? "";

        if (className) {
            cell.className = className;
        }

        row.appendChild(cell);
    }

    function setDefaultListPeriod() {
        if (listStartDate.value && listEndDate.value) {
            return;
        }

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 13);

        listStartDate.value = formatDate(startDate);
        listEndDate.value = formatDate(today);
    }

        function updateConditionColumns(dates) {
        const table = document.getElementById("records-table");
        const header = table.tHead.rows[0];
        const colgroup = table.querySelector("colgroup");

        header.querySelectorAll(
            "#list-category-a-heading, #list-category-b-heading, [data-condition-column]"
        ).forEach(cell => cell.remove());

        colgroup.querySelectorAll(".condition-column").forEach(col => col.remove());

        function appearsInPeriod(itemIds) {
            return dates.some(date => {
                const condition = records[date]?.condition || {};
                return itemIds.some(id => Object.hasOwn(condition, id));
            });
        }

        const categories = checklistSettings.categories.filter(category =>
            !category.archived || appearsInPeriod(category.items.map(item => item.id))
        );
        const standaloneItems = checklistSettings.standaloneItems.filter(item =>
            !item.archived || appearsInPeriod([item.id])
        );

        for (const item of [...categories, ...standaloneItems]) {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.dataset.conditionColumn = "";
            cell.textContent = item.name;
            header.insertBefore(cell, header.lastElementChild);

            const col = document.createElement("col");
            col.className = "condition-column";
            colgroup.insertBefore(col, colgroup.lastElementChild);
        }

        return { categories, standaloneItems };
    }


    function renderRecordsTable() {
        records = readRecords();

        const startDate = listStartDate.value;
        const endDate = listEndDate.value;

        recordsTableBody.innerHTML = "";

        if (startDate && endDate && startDate > endDate) {
            noRecordsMessage.textContent =
                "開始日は終了日以前に設定してください";
            noRecordsMessage.hidden = false;
            return;
        }

        const dates = Object.keys(records)
            .filter(function (date) {
                return (
                    (!startDate || date >= startDate) &&
                    (!endDate || date <= endDate)
                );
            })
            .sort();
                    const { categories, standaloneItems } = updateConditionColumns(dates);

        if (dates.length === 0) {
            noRecordsMessage.textContent =
                "指定した期間に記録はありません";
            noRecordsMessage.hidden = false;
            return;
        }

        noRecordsMessage.hidden = true;

        dates.forEach(function (date) {
            const record = records[date] || {};
            const condition = record.condition || {};
            const row = document.createElement("tr");

            createTableCell(row, formatTableDate(date));
            createTableCell(row, record.bedtime || "");
            createTableCell(row, record.wakeTime || "");
            createTableCell(
                row,
                calculateSleepDuration(record.bedtime, record.wakeTime)
            );
            createTableCell(row, record.sleepSatisfaction || "");
            createTableCell(
                row,
                record.mood === 0 || record.mood ? record.mood : ""
            );

                        for (const category of categories) {
                createTableCell(row, categoryScore(category, condition) ?? "");
            }

            for (const item of standaloneItems) {
                createTableCell(
                    row,
                    conditionIsChecked(condition[item.id]) ? "○" : ""
                );
            }
            createTableCell(row, record.memo || "", "memo-cell");

            recordsTableBody.appendChild(row);
        });
    }

    function convertSatisfactionToNumber(satisfaction) {
        const satisfactionValues = {
            "ほとんど眠れていない": 0,
            "あまり眠れていない": 1,
            "よく眠れた": 2,
            "とてもよく眠れた": 3
        };

        if (satisfactionValues[satisfaction] === undefined) {
            return null;
        }

        return satisfactionValues[satisfaction];
    }

    function setDefaultTrendPeriod() {
        if (trendStartDate.value && trendEndDate.value) {
            return;
        }

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 13);

        trendStartDate.value = formatDate(startDate);
        trendEndDate.value = formatDate(today);
    }

    function convertTimeToHours(value) {
        if (!value) {
            return null;
        }

        const parts = value.split(":").map(Number);

        if (
            parts.length !== 2 ||
            !Number.isFinite(parts[0]) ||
            !Number.isFinite(parts[1])
        ) {
            return null;
        }

        let time = parts[0] + parts[1] / 60;

        if (time < 12) {
            time += 24;
        }

        return time;
    }

    function formatClockHours(value) {
        if (
            value === null ||
            value === undefined ||
            !Number.isFinite(Number(value))
        ) {
            return "";
        }

        let totalMinutes = Math.round(Number(value) * 60);

        totalMinutes =
            (totalMinutes % (24 * 60) + 24 * 60) % (24 * 60);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return (
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}`
        );
    }

    function createChartOptions(minimum, maximum, stepSize, yAxisTitle) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 300
            },
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "日付"
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    min: minimum,
                    max: maximum,
                    title: {
                        display: true,
                        text: yAxisTitle
                    },
                    ticks: {
                        stepSize: stepSize
                    }
                }
            }
        };
    }

    function destroyTrendCharts() {
        if (sleepChart) {
            sleepChart.destroy();
            sleepChart = null;
        }

        if (moodChart) {
            moodChart.destroy();
            moodChart = null;
        }

        if (satisfactionChart) {
            satisfactionChart.destroy();
            satisfactionChart = null;
        }

        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
        }
    }

    function renderTrendCharts() {
        if (typeof Chart === "undefined") {
            window.alert(
                "グラフ機能を読み込めませんでした。通信環境を確認してください。"
            );
            return false;
        }

        records = readRecords();

        const startDate = trendStartDate.value;
        const endDate = trendEndDate.value;

        if (startDate && endDate && startDate > endDate) {
            window.alert("開始日は終了日以前に設定してください");
            return false;
        }

        const dates = Object.keys(records)
            .filter(function (date) {
                return (
                    (!startDate || date >= startDate) &&
                    (!endDate || date <= endDate)
                );
            })
            .sort();

        const labels = dates.map(function (date) {
            return formatChartDate(date);
        });

        const bedtimeValues = dates.map(function (date) {
            const record = records[date] || {};
            return convertTimeToHours(record.bedtime);
        });

        const wakeTimeValues = dates.map(function (date) {
            const record = records[date] || {};
            return convertTimeToHours(record.wakeTime);
        });

        const moodValues = dates.map(function (date) {
            const record = records[date] || {};

            if (record.mood === 0 || record.mood) {
                return Number(record.mood);
            }

            return null;
        });

        const satisfactionValues = dates.map(function (date) {
            const record = records[date] || {};
            return convertSatisfactionToNumber(record.sleepSatisfaction);
        });

                const categoryDatasets = checklistSettings.categories.flatMap(
            (category, index) => {
                const data = dates.map(date =>
                    categoryScore(category, records[date]?.condition || {})
                );

                if (category.archived && data.every(value => value === null)) {
                    return [];
                }

                const color = `hsl(${Math.round(index * 137.508) % 360}, 64%, 40%)`;
                return [{
                    label: category.name,
                    data,
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.15,
                    spanGaps: false
                }];
            }
        );


        destroyTrendCharts();

        const sleepOptions = createChartOptions(12, 36, 1, "時刻");
        sleepOptions.plugins.legend.display = true;
        sleepOptions.scales.y.ticks.callback = function (value) {
            return formatClockHours(value);
        };
        sleepOptions.plugins.tooltip.callbacks = {
            label: function (context) {
                return (
                    `${context.dataset.label}: ` +
                    formatClockHours(context.parsed.y)
                );
            }
        };

        sleepChart = new Chart(sleepChartCanvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "就寝時刻",
                        data: bedtimeValues,
                        borderColor: "#4472c4",
                        backgroundColor: "#4472c4",
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.15,
                        spanGaps: false
                    },
                    {
                        label: "起床時刻",
                        data: wakeTimeValues,
                        borderColor: "#ed7d31",
                        backgroundColor: "#ed7d31",
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.15,
                        spanGaps: false
                    }
                ]
            },
            options: sleepOptions
        });

        moodChart = new Chart(moodChartCanvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: moodValues,
                        borderColor: "#70ad47",
                        backgroundColor: "#70ad47",
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.15,
                        spanGaps: false
                    }
                ]
            },
            options: createChartOptions(-3, 3, 1, "気分")
        });

        satisfactionChart = new Chart(satisfactionChartCanvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: satisfactionValues,
                        borderColor: "#ffc000",
                        backgroundColor: "#ffc000",
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.15,
                        spanGaps: false
                    }
                ]
            },
            options: createChartOptions(0, 3, 1, "睡眠満足度")
        });

                const categoryOptions = createChartOptions(0, 10, 1, "合計点");
        categoryOptions.plugins.legend.display = true;
        categoryOptions.plugins.tooltip.displayColors = true;

        categoryChart = new Chart(categoryChartCanvas, {
            type: "line",
            data: {
                labels,
                datasets: categoryDatasets
            },
            options: categoryOptions
        });


        return true;
    }

    function hideAllPages() {
        recordPage.hidden = true;
        listPage.hidden = true;
        trendPage.hidden = true;

        recordNavButton.classList.remove("active");
        listNavButton.classList.remove("active");
        trendNavButton.classList.remove("active");
    }

    function showRecordPage() {
        closeAllMenus();
        hideAllPages();

        recordPage.hidden = false;
        recordActionBar.hidden = false;
        document.body.classList.add("record-view");
        recordNavButton.classList.add("active");

        window.scrollTo(0, 0);
    }

    function showListPage() {
        closeAllMenus();
        hideAllPages();

        recordActionBar.hidden = true;
        document.body.classList.remove("record-view");
        listPage.hidden = false;
        listNavButton.classList.add("active");

        setDefaultListPeriod();
        renderRecordsTable();

        window.scrollTo(0, 0);
    }

    function showTrendPage() {
        closeAllMenus();
        hideAllPages();

        recordActionBar.hidden = true;
        document.body.classList.remove("record-view");
        trendPage.hidden = false;
        trendNavButton.classList.add("active");

        setDefaultTrendPeriod();
        renderTrendCharts();

        window.scrollTo(0, 0);
    }

        const checklistEditor = settingsModal.querySelector(".settings-categories");
    let draftChecklistSettings;

    function fillSettingsForm() {
        draftChecklistSettings = JSON.parse(JSON.stringify(checklistSettings));
        renderChecklistEditor();
    }

    function renderChecklistEditor() {
        checklistEditor.replaceChildren();

        function addButton(parent, text, onClick) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = text;
            button.addEventListener("click", onClick);
            parent.append(button);
        }

        function addNameInput(parent, labelText, item, maxLength = 40) {
            const label = document.createElement("label");
            label.textContent = labelText;

            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = maxLength;
            input.value = item.name;
            input.addEventListener("input", () => {
                item.name = input.value;
            });

            label.append(input);
            parent.append(label);
        }

        function addEditorSection() {
            const section = document.createElement("section");
            section.className = "settings-category";
            checklistEditor.append(section);
            return section;
        }

        function removeFromInput(item) {
            item.archived = true;
            renderChecklistEditor();
        }

        for (const category of draftChecklistSettings.categories) {
            if (category.archived) continue;

            const section = addEditorSection();
            addNameInput(section, "カテゴリー名", category, 30);

            const items = document.createElement("div");
            items.className = "item-settings";

            category.items.forEach((item, index) => {
                addNameInput(items, `項目${index + 1}`, item);
            });

            section.append(items);
            addButton(section, "このカテゴリーを削除", () => {
                removeFromInput(category);
            });
        }

        const standaloneSection = addEditorSection();
        const heading = document.createElement("h3");
        heading.textContent = "単独の体調項目";
        standaloneSection.append(heading);

        for (const item of draftChecklistSettings.standaloneItems) {
            if (item.archived) continue;

            const row = document.createElement("div");
            addNameInput(row, "体調名", item);
            addButton(row, "削除", () => removeFromInput(item));
            standaloneSection.append(row);
        }

        addButton(standaloneSection, "単独項目を追加", () => {
            draftChecklistSettings.standaloneItems.push({
                id: crypto.randomUUID(),
                name: ""
            });
            renderChecklistEditor();
        });

        addButton(addEditorSection(), "カテゴリーを追加", () => {
            draftChecklistSettings.categories.push({
                id: crypto.randomUUID(),
                name: "新しいカテゴリー",
                items: Array.from({ length: 10 }, (_, index) => ({
                    id: crypto.randomUUID(),
                    name: `項目${index + 1}`
                }))
            });
            renderChecklistEditor();
        });
    }

    function closeSettings() {
        settingsModal.hidden = true;
    }

    settingsButton.addEventListener("click", () => {
        fillSettingsForm();
        settingsModal.hidden = false;
    });

    settingsCancel.addEventListener("click", closeSettings);

    settingsModal.addEventListener("click", event => {
        if (event.target === settingsModal) closeSettings();
    });

    settingsSave.addEventListener("click", () => {
        for (const category of draftChecklistSettings.categories) {
            if (category.archived) continue;
            category.name = category.name.trim() || "カテゴリー";
            category.items.forEach((item, index) => {
                item.name = item.name.trim() || `項目${index + 1}`;
            });
        }

        const standaloneItems = draftChecklistSettings.standaloneItems.filter(
            item => !item.archived
        );
        if (standaloneItems.some(item => !item.name.trim())) {
            alert("単独項目の体調名を入力してください。");
            return;
        }
        standaloneItems.forEach(item => {
            item.name = item.name.trim();
        });

        try {
            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(draftChecklistSettings)
            );
        } catch (error) {
            alert("設定を保存できませんでした。");
            return;
        }

        checklistSettings = draftChecklistSettings;
        renderChecklist();
        conditionInputs = [...checklistContainer.querySelectorAll("[data-condition]")];
        loadSelectedRecord();
        closeSettings();
        showMessage("設定を保存しました");
    });


    editDateButton.addEventListener("click", function () {
        const willOpen = dateMenu.hidden;
        closeAllMenus();

        if (willOpen) {
            editDateInput.value = selectedDate;
            dateMenu.hidden = false;
        }
    });

    document.getElementById("previous-day").addEventListener(
        "click",
        function () {
            moveDate(-1);
        }
    );

    document.getElementById("next-day").addEventListener(
        "click",
        function () {
            moveDate(1);
        }
    );

    document.getElementById("today-button").addEventListener(
        "click",
        function () {
            editDateInput.value = formatDate(new Date());
        }
    );

    document.getElementById("tomorrow-button").addEventListener(
        "click",
        function () {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            editDateInput.value = formatDate(tomorrow);
        }
    );

    document.getElementById("date-cancel").addEventListener(
        "click",
        function () {
            editDateInput.value = selectedDate;
            dateMenu.hidden = true;
        }
    );

    document.getElementById("date-confirm").addEventListener(
        "click",
        function () {
            changeSelectedDate(editDateInput.value);
            dateMenu.hidden = true;
        }
    );

    bedtimeButton.addEventListener("click", function () {
        openTimeMenu(bedtimeMenu, bedtimeInput, bedtimeButton);
    });

    document.getElementById("bedtime-now").addEventListener(
        "click",
        function () {
            bedtimeInput.value = getCurrentTime();
        }
    );

    document.getElementById("bedtime-cancel").addEventListener(
        "click",
        function () {
            bedtimeMenu.hidden = true;
        }
    );

    document.getElementById("bedtime-confirm").addEventListener(
        "click",
        function () {
            confirmTime(bedtimeMenu, bedtimeInput, bedtimeButton);
        }
    );

    wakeTimeButton.addEventListener("click", function () {
        openTimeMenu(wakeTimeMenu, wakeTimeInput, wakeTimeButton);
    });

    document.getElementById("wake-time-now").addEventListener(
        "click",
        function () {
            wakeTimeInput.value = getCurrentTime();
        }
    );

    document.getElementById("wake-time-cancel").addEventListener(
        "click",
        function () {
            wakeTimeMenu.hidden = true;
        }
    );

    document.getElementById("wake-time-confirm").addEventListener(
        "click",
        function () {
            confirmTime(wakeTimeMenu, wakeTimeInput, wakeTimeButton);
        }
    );

    satisfactionButton.addEventListener("click", function () {
        const willOpen = satisfactionMenu.hidden;
        closeAllMenus();
        satisfactionMenu.hidden = !willOpen;
    });

    satisfactionMenu.addEventListener("click", function (event) {
        const option = event.target.closest("button[data-value]");

        if (!option) {
            return;
        }

        selectedSatisfaction = option.dataset.value;
        satisfactionButton.textContent = selectedSatisfaction;
        satisfactionMenu.hidden = true;
        hideMessage();
    });

    moodButton.addEventListener("click", function () {
        const willOpen = moodMenu.hidden;
        closeAllMenus();
        moodMenu.hidden = !willOpen;
    });

    moodMenu.addEventListener("click", function (event) {
        const option = event.target.closest("button[data-value]");

        if (!option) {
            return;
        }

        selectedMood = option.dataset.value;
        moodButton.textContent = selectedMood;
        moodMenu.hidden = true;
        hideMessage();
    });

    clearButton.addEventListener("click", clearSelectedRecord);
    saveButton.addEventListener("click", saveRecord);

    recordNavButton.addEventListener("click", showRecordPage);
    listNavButton.addEventListener("click", showListPage);
    trendNavButton.addEventListener("click", showTrendPage);

    if (updateListButton) {
        updateListButton.addEventListener("click", renderRecordsTable);
    }

    if (printButton) {
        printButton.addEventListener("click", function () {
            renderRecordsTable();
            window.print();
        });
    }

    if (updateTrendButton) {
        updateTrendButton.addEventListener("click", renderTrendCharts);
    }

    if (trendPrintButton) {
        trendPrintButton.addEventListener("click", function () {
            const rendered = renderTrendCharts();

            if (!rendered) {
                return;
            }

            document.body.classList.add("trend-print");
            document.body.classList.toggle(
                "mobile-trend-print",
                window.matchMedia("(max-width: 768px)").matches
            );

            let pageStyle = document.getElementById(
                "trend-print-page-style"
            );

            if (!pageStyle) {
                pageStyle = document.createElement("style");
                pageStyle.id = "trend-print-page-style";
                document.head.appendChild(pageStyle);
            }

            pageStyle.textContent = `
                @page {
                    size: A4 portrait;
                    margin: 4mm;
                }

                @media print {
                    body.trend-print.mobile-trend-print,
                    body.trend-print.mobile-trend-print .app,
                    body.trend-print.mobile-trend-print #trend-page {
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }

                    body.trend-print.mobile-trend-print #trend-page {
                        display: block !important;
                    }

                    body.trend-print.mobile-trend-print .trend-header {
                        margin: 0 0 0.5mm !important;
                        padding: 0 !important;
                    }

                    body.trend-print.mobile-trend-print .trend-main-title {
                        margin: 0 !important;
                        font-size: 12px !important;
                        line-height: 1 !important;
                    }

                    body.trend-print.mobile-trend-print .trend-block {
                        width: 100% !important;
                        margin: 0 0 4mm !important;
                        padding: 0 !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    body.trend-print.mobile-trend-print .trend-block:last-child {
                        margin-bottom: 0 !important;
                    }

                    body.trend-print.mobile-trend-print .trend-block h2 {
                        margin: 0 0 0.25mm !important;
                        font-size: 8px !important;
                        line-height: 1 !important;
                    }

                    body.trend-print.mobile-trend-print .chart-area {
                        display: block !important;
                        width: 100% !important;
                        height: 68mm !important;
                        min-height: 68mm !important;
                        max-height: 68mm !important;
                        margin: 0 !important;
                        padding: 1px !important;
                        overflow: hidden !important;
                    }

                    body.trend-print.mobile-trend-print .chart-area canvas {
                        display: block !important;
                        width: 100% !important;
                        height: 100% !important;
                        max-width: 100% !important;
                        max-height: 100% !important;
                    }

                    body.trend-print.mobile-trend-print .satisfaction-note {
                        display: grid !important;
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 0.5mm !important;
                        margin: 0.25mm 0 0 !important;
                        padding: 0 !important;
                        font-size: 5px !important;
                        line-height: 1 !important;
                    }
                }
            `;

            window.setTimeout(function () {
                if (sleepChart) {
                    sleepChart.resize();
                }
                if (moodChart) {
                    moodChart.resize();
                }
                if (satisfactionChart) {
                    satisfactionChart.resize();
                }
                if (categoryChart) {
                    categoryChart.resize();
                }

                window.setTimeout(function () {
                    window.print();
                }, 150);
            }, 150);
        });
    }

    window.addEventListener("afterprint", function () {
        document.body.classList.remove("trend-print");
        document.body.classList.remove("mobile-trend-print");

        const pageStyle = document.getElementById(
            "trend-print-page-style"
        );

        if (pageStyle) {
            pageStyle.remove();
        }

        window.setTimeout(function () {
            if (sleepChart) {
                sleepChart.resize();
            }
            if (moodChart) {
                moodChart.resize();
            }
            if (satisfactionChart) {
                satisfactionChart.resize();
            }
            if (categoryChart) {
                categoryChart.resize();
            }
        }, 100);
    });

    document.addEventListener("click", function (event) {
        const clickedInside =
            dateMenu.contains(event.target) ||
            bedtimeMenu.contains(event.target) ||
            wakeTimeMenu.contains(event.target) ||
            satisfactionMenu.contains(event.target) ||
            moodMenu.contains(event.target);

        const clickedButton =
            event.target === editDateButton ||
            event.target === bedtimeButton ||
            event.target === wakeTimeButton ||
            event.target === satisfactionButton ||
            event.target === moodButton;

        if (!clickedInside && !clickedButton) {
            closeAllMenus();
        }
    });

    changeSelectedDate(selectedDate);
    showRecordPage();
});


async function loadNotices() {
  const response = await fetch(
    "./notices.json?t=" + Date.now(),
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("お知らせの取得に失敗しました");
  }

  const data = await response.json();
  return data.notices;
}

/* ===== 共通設定：データ移行・シェア・アプリ一覧 ===== */

document.addEventListener("DOMContentLoaded", function () {
  const byId = id => document.getElementById(id);

  const open = id => {
    byId(id).hidden = false;
  };

  const close = id => {
    byId(id).hidden = true;
  };

  const homeUrl =
    "https://kotom0919.github.io/Sleep-and-Mood-Tracking-ver2-/";

  // 設定を開く・閉じる
  byId("app-settings-button").addEventListener("click", () => {
    open("app-settings-modal");
  });

  byId("app-settings-close").addEventListener("click", () => {
    close("app-settings-modal");
  });

  document.querySelectorAll("[data-close-app-modal]").forEach(button => {
    button.addEventListener("click", () => {
      close(button.dataset.closeAppModal);
    });
  });

  ["app-settings-modal", "app-transfer-modal", "app-share-modal"].forEach(id => {
    byId(id).addEventListener("click", event => {
      if (event.target === byId(id)) close(id);
    });
  });

  // データ移行を開く
  byId("app-data-transfer").addEventListener("click", () => {
    close("app-settings-modal");
    open("app-transfer-modal");
  });

  // アプリ共有を開く
  byId("app-share-open").addEventListener("click", () => {
    close("app-settings-modal");

    byId("app-share-url").value = homeUrl;

    byId("app-share-qr").src =
      "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
      encodeURIComponent(homeUrl);

    open("app-share-modal");
  });


    // ほかのアプリを探す
  byId("app-other-apps").addEventListener("click", () => {
    close("app-settings-modal");
    window.location.assign("https://kotom0919.github.io/App-menu/");
  });


  // データを書き出す
  byId("app-export").addEventListener("click", () => {
    try {
      const payload = {
        app: "Sleep-and-Mood-Tracking-ver2-",
        version: 1,
        exportedAt: new Date().toISOString(),
        sleepRecords: JSON.parse(
          localStorage.getItem("sleepRecords") || "{}"
        ),
        conditionChecklistSettings: JSON.parse(
          localStorage.getItem("conditionChecklistSettings") || "null"
        )
      };

      const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download =
        "sleep-records-backup-" +
        new Date().toISOString().slice(0, 10) +
        ".json";

      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2000);

      byId("app-transfer-status").textContent =
        "バックアップファイルを作成しました。";
    } catch (error) {
      byId("app-transfer-status").textContent =
        "書き出しに失敗しました：" + error.message;
    }
  });

  // データを読み込む
  byId("app-import").addEventListener("click", () => {
    byId("app-import-file").click();
  });

  byId("app-import-file").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());

      if (
        data.app !== "Sleep-and-Mood-Tracking-ver2-" ||
        !data.sleepRecords ||
        typeof data.sleepRecords !== "object" ||
        Array.isArray(data.sleepRecords) ||
        (
          data.conditionChecklistSettings !== null &&
          (
                        !(
              (
                Array.isArray(data.conditionChecklistSettings?.categoryA?.items) &&
                Array.isArray(data.conditionChecklistSettings?.categoryB?.items)
              ) ||
              (
                Array.isArray(data.conditionChecklistSettings?.categories) &&
                Array.isArray(data.conditionChecklistSettings?.standaloneItems)
              )
            )
          )
        )
      ) {
        throw new Error(
          "このアプリのバックアップファイルではありません。"
        );
      }

      const confirmed = confirm(
        "現在の睡眠・体調記録と項目設定を" +
        "バックアップの内容で置き換えます。" +
        "元に戻せません。続けますか？"
      );

      if (!confirmed) return;

      localStorage.setItem(
        "sleepRecords",
        JSON.stringify(data.sleepRecords)
      );

      if (data.conditionChecklistSettings) {
        localStorage.setItem(
          "conditionChecklistSettings",
          JSON.stringify(data.conditionChecklistSettings)
        );
      } else {
        localStorage.removeItem("conditionChecklistSettings");
      }

      alert("読み込みました。画面を更新します。");
      location.reload();

    } catch (error) {
      byId("app-transfer-status").textContent =
        "読み込みに失敗しました：" + error.message;
    } finally {
      event.target.value = "";
    }
  });

  // URLコピー
  byId("app-copy-url").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(homeUrl);

      byId("app-share-status").textContent =
        "URLをコピーしました。";
    } catch {
      byId("app-share-url").select();

      byId("app-share-status").textContent =
        "URLを選択しました。コピーしてください。";
    }
  });

  // iPhoneなどの共有機能
  byId("app-native-share").addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "睡眠＆体調記録",
          url: homeUrl
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          byId("app-share-status").textContent =
            "共有できませんでした。";
        }
      }
    } else {
      byId("app-share-status").textContent =
        "この環境では共有機能が使えません。" +
        "URLコピーを利用してください。";
    }
  });
});
/* 日付と現在時刻を表示 */
(function () {
    function startClock() {
        const clock = document.getElementById("current-clock");
        if (!clock) return;

        const dateLine = document.createElement("span");
        dateLine.className = "clock-date";

        const timeLine = document.createElement("span");
        timeLine.className = "clock-time";

        clock.replaceChildren(dateLine, timeLine);

        function updateClock() {
            const now = new Date();
            const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

            dateLine.textContent =
                `${now.getFullYear()}年` +
                `${now.getMonth() + 1}月` +
                `${now.getDate()}日（${weekdays[now.getDay()]}）`;

            const hours = String(now.getHours()).padStart(2, "0");
            const minutes = String(now.getMinutes()).padStart(2, "0");
            const seconds = String(now.getSeconds()).padStart(2, "0");

            timeLine.textContent = `${hours}:${minutes}:${seconds}`;
        }

        updateClock();
        setInterval(updateClock, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startClock);
    } else {
        startClock();
    }
})();

/* ===== 自動保存・メモ入力画面 ===== */
document.addEventListener("DOMContentLoaded", function () {
    const saveButton = document.getElementById("save-button");
    const memoInput = document.getElementById("memo-input");
    const memoSection = memoInput.closest(".memo-section");
    const saveMessage = document.getElementById("save-message");

    // 既存の保存処理を内部で使用する
    saveButton.hidden = true;

    function autoSave() {
        saveButton.click();

        if (saveMessage.textContent === "記録しました") {
            saveMessage.textContent = "保存しました";
        }
    }

    // 時刻：「決定」が正常に完了した場合だけ保存
    [
        ["bedtime-confirm", "bedtime-menu"],
        ["wake-time-confirm", "wake-time-menu"]
    ].forEach(function ([buttonId, menuId]) {
        document.getElementById(buttonId).addEventListener(
            "click",
            function () {
                if (document.getElementById(menuId).hidden) {
                    autoSave();
                }
            }
        );
    });

    // 睡眠満足度・気分：選択後に保存
    ["satisfaction-menu", "mood-menu"].forEach(function (menuId) {
        document.getElementById(menuId).addEventListener(
            "click",
            function (event) {
                if (event.target.closest("button[data-value]")) {
                    autoSave();
                }
            }
        );
    });

    // 体調チェック：項目設定で再生成されたチェックにも対応
    document.getElementById("record-page").addEventListener(
        "change",
        function (event) {
            if (event.target.matches("input[data-condition]")) {
                autoSave();
            }
        }
    );

    /* メモ表示欄と入力ボタン */
    const memoHeading = memoSection.querySelector("h2");
    memoHeading.removeAttribute("id");

    const memoDisplay = document.createElement("p");
    memoDisplay.id = "memo-display";
    memoDisplay.className = "memo-display";

    const memoOpenButton = document.createElement("button");
    memoOpenButton.type = "button";
    memoOpenButton.className = "memo-open-button";
    memoOpenButton.textContent = "メモを入力する";

    memoSection.append(memoDisplay, memoOpenButton);

    /* メモ入力ダイアログ */
    const memoDialog = document.createElement("dialog");
    memoDialog.className = "memo-editor-dialog";
    memoDialog.setAttribute("aria-labelledby", "memo-editor-title");

    const editorTitle = document.createElement("h2");
    editorTitle.id = "memo-editor-title";
    editorTitle.textContent = "メモを入力";

    const editorLabel = document.createElement("label");
    editorLabel.htmlFor = "memo-input";
    editorLabel.textContent = "メモ";

    const editorActions = document.createElement("div");
    editorActions.className = "memo-editor-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel-button";
    cancelButton.textContent = "キャンセル";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "confirm-button";
    confirmButton.textContent = "決定";

    editorActions.append(cancelButton, confirmButton);

    // 元の入力欄を移動し、既存の保存処理を維持
    memoDialog.append(
        editorTitle,
        editorLabel,
        memoInput,
        editorActions
    );
    document.body.appendChild(memoDialog);

    let originalMemo = "";

    function renderMemo() {
        memoDisplay.textContent = memoInput.value;
        memoDisplay.hidden = memoInput.value.length === 0;
    }

    function updateMemoHeight() {
        memoInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );
    }

    memoOpenButton.addEventListener("click", function () {
        originalMemo = memoInput.value;
        memoDialog.showModal();
        updateMemoHeight();
        memoInput.focus();
    });

    function cancelMemo() {
        memoInput.value = originalMemo;
        updateMemoHeight();
        memoDialog.close();
    }

    cancelButton.addEventListener("click", cancelMemo);

    // Escキーでも変更を破棄
    memoDialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        cancelMemo();
    });

    confirmButton.addEventListener("click", function () {
        memoInput.value = memoInput.value.trim();
        autoSave();

        // 保存に失敗した場合は入力画面を開いたままにする
        if (saveMessage.textContent !== "保存しました") {
            window.alert(
                saveMessage.textContent ||
                "保存できませんでした。もう一度お試しください。"
            );
            return;
        }

        renderMemo();
        memoDialog.close();
    });

    // 日付移動・クリア・項目設定後に表示を同期
    [
        "previous-day",
        "next-day",
        "date-confirm",
        "clear-button",
        "settings-save"
    ].forEach(function (buttonId) {
        document.getElementById(buttonId).addEventListener(
            "click",
            renderMemo
        );
    });

    renderMemo();
});