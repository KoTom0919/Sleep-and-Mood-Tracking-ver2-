document.addEventListener("DOMContentLoaded", function () {

    const STORAGE_KEY = "sleepRecords";
    const SETTINGS_KEY =
        "conditionChecklistSettings";


    const defaultChecklistSettings = {

        categoryA: {

            name:
                "カテゴリーA",

            items:
                Array.from(
                    {
                        length: 10
                    },
                    function (_, index) {

                        return (
                            `項目${index + 1}`
                        );

                    }
                )

        },

        categoryB: {

            name:
                "カテゴリーB",

            items:
                Array.from(
                    {
                        length: 10
                    },
                    function (_, index) {

                        return (
                            `項目${index + 1}`
                        );

                    }
                )

        }

    };


    function readChecklistSettings() {

        try {

            const saved =
                JSON.parse(
                    localStorage.getItem(
                        SETTINGS_KEY
                    )
                );


            if (
                saved &&
                saved.categoryA &&
                saved.categoryB
            ) {

                return saved;

            }

        } catch (error) {

            console.error(
                "設定を読み込めませんでした。",
                error
            );

        }


        return JSON.parse(
            JSON.stringify(
                defaultChecklistSettings
            )
        );

    }


    let checklistSettings =
        readChecklistSettings();


    function renderChecklist() {

        [
            "A",
            "B"
        ].forEach(
            function (letter) {

                const lowerLetter =
                    letter.toLowerCase();

                const categoryKey =
                    `category${letter}`;

                const category =
                    checklistSettings[
                    categoryKey
                    ];

                const list =
                    document.getElementById(
                        `category-${lowerLetter}-list`
                    );


                document.getElementById(
                    `category-${lowerLetter}-heading`
                ).textContent =
                    category.name;


                document.getElementById(
                    `list-category-${lowerLetter}-heading`
                ).textContent =
                    category.name;


                list.innerHTML = "";


                category.items.forEach(
                    function (
                        itemName,
                        index
                    ) {

                        const label =
                            document.createElement(
                                "label"
                            );

                        label.className =
                            "symptom-item";


                        const span =
                            document.createElement(
                                "span"
                            );

                        span.textContent =
                            itemName;


                        const input =
                            document.createElement(
                                "input"
                            );

                        input.type =
                            "checkbox";

                        input.dataset.condition =
                            `${lowerLetter}${index + 1}`;


                        label.append(
                            span,
                            input
                        );

                        list.appendChild(
                            label
                        );

                    }
                );

            }
        );

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


    /* =================================================
       HTML要素
    ================================================= */

    const recordPage =
        document.getElementById("record-page");

    const listPage =
        document.getElementById("list-page");

    const trendPage =
        document.getElementById("trend-page");


    const recordNavButton =
        document.getElementById("record-nav-button");

    const listNavButton =
        document.getElementById("list-nav-button");

    const trendNavButton =
        document.getElementById("trend-nav-button");


    /* 日付 */

    const editDateButton =
        document.getElementById("edit-date-button");

    const editDateInput =
        document.getElementById("edit-date-input");

    const dateMenu =
        document.getElementById("date-menu");


    /* 就寝時刻 */

    const bedtimeButton =
        document.getElementById("bedtime-button");

    const bedtimeMenu =
        document.getElementById("bedtime-menu");

    const bedtimeInput =
        document.getElementById("bedtime-input");


    /* 起床時刻 */

    const wakeTimeButton =
        document.getElementById("wake-time-button");

    const wakeTimeMenu =
        document.getElementById("wake-time-menu");

    const wakeTimeInput =
        document.getElementById("wake-time-input");


    /* 睡眠満足度 */

    const satisfactionButton =
        document.getElementById("satisfaction-button");

    const satisfactionMenu =
        document.getElementById("satisfaction-menu");


    /* 気分 */

    const moodButton =
        document.getElementById("mood-button");

    const moodMenu =
        document.getElementById("mood-menu");


    /* 体調・メモ */

    let conditionInputs = [
        ...document.querySelectorAll("[data-condition]")
    ];

    const settingsButton =
        document.getElementById(
            "settings-button"
        );

    const settingsModal =
        document.getElementById(
            "settings-modal"
        );

    const settingsCancel =
        document.getElementById(
            "settings-cancel"
        );

    const settingsSave =
        document.getElementById(
            "settings-save"
        );

    const categoryAName =
        document.getElementById(
            "category-a-name"
        );

    const categoryBName =
        document.getElementById(
            "category-b-name"
        );

    const categoryASettings =
        document.getElementById(
            "category-a-settings"
        );

    const categoryBSettings =
        document.getElementById(
            "category-b-settings"
        );

    const memoInput =
        document.getElementById("memo-input");


    /* 記録・クリア */

    const saveButton =
        document.getElementById("save-button");

    const clearButton =
        document.getElementById("clear-button");

    const saveMessage =
        document.getElementById("save-message");

    const recordActionBar =
        document.getElementById("record-action-bar");


    /* 一覧 */

    const recordsTableBody =
        document.getElementById("records-table-body");

    const noRecordsMessage =
        document.getElementById("no-records-message");

    const listStartDate =
        document.getElementById("list-start-date");

    const listEndDate =
        document.getElementById("list-end-date");

    const updateListButton =
        document.getElementById("update-list-button");

    const printButton =
        document.getElementById("print-button");


    /* 推移 */

    const trendStartDate =
        document.getElementById("trend-start-date");

    const trendEndDate =
        document.getElementById("trend-end-date");

    const updateTrendButton =
        document.getElementById("update-trend-button");

    const trendPrintButton =
        document.getElementById("trend-print-button");

    const sleepChartCanvas =
        document.getElementById("sleep-chart");

    const moodChartCanvas =
        document.getElementById("mood-chart");

    const satisfactionChartCanvas =
        document.getElementById("satisfaction-chart");

    const categoryChartCanvas =
        document.getElementById("category-chart");


    /* =================================================
       ローカルストレージ
    ================================================= */

    function readRecords() {

        try {

            const savedData =
                localStorage.getItem(STORAGE_KEY);

            return savedData
                ? JSON.parse(savedData)
                : {};

        } catch (error) {

            console.error(
                "記録を読み込めませんでした。",
                error
            );

            return {};

        }

    }


    function saveRecords() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(records)
            );

            return true;

        } catch (error) {

            console.error(
                "記録を保存できませんでした。",
                error
            );

            showMessage(
                "記録を保存できませんでした",
                "error"
            );

            return false;

        }

    }


    /* =================================================
       日付
    ================================================= */

    function formatDate(date) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;

    }


    function parseDate(value) {

        const parts =
            value
                .split("-")
                .map(Number);

        return new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );

    }


    function displayDate(value) {

        const date =
            parseDate(value);

        return (
            `${date.getFullYear()}年` +
            `${date.getMonth() + 1}月` +
            `${date.getDate()}日`
        );

    }


    function formatTableDate(value) {

        const date =
            parseDate(value);

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return (
            `${date.getFullYear()}/` +
            `${month}/${day}`
        );

    }


    function formatChartDate(value) {

        const date =
            parseDate(value);

        return (
            `${date.getMonth() + 1}/` +
            `${date.getDate()}`
        );

    }


    function changeSelectedDate(value) {

        if (!value) {
            return;
        }

        selectedDate = value;

        editDateButton.textContent =
            displayDate(value);

        editDateInput.value = value;

        loadSelectedRecord();

        hideMessage();

    }


    function moveDate(days) {

        const date =
            parseDate(selectedDate);

        date.setDate(
            date.getDate() + days
        );

        changeSelectedDate(
            formatDate(date)
        );

    }


    /* =================================================
       選択日の記録を読み込む
    ================================================= */

    function conditionIsChecked(value) {

        return (
            value === true ||
            value === "○" ||
            value === "〇"
        );

    }


    function loadSelectedRecord() {

        records = readRecords();

        const record =
            records[selectedDate] || {};


        bedtimeButton.textContent =
            record.bedtime ||
            "○○：○○";

        bedtimeInput.value =
            record.bedtime || "";


        wakeTimeButton.textContent =
            record.wakeTime ||
            "○○：○○";

        wakeTimeInput.value =
            record.wakeTime || "";


        selectedSatisfaction =
            record.sleepSatisfaction ||
            null;

        satisfactionButton.textContent =
            selectedSatisfaction ||
            "－";


        if (
            record.mood === 0 ||
            record.mood
        ) {

            selectedMood =
                String(record.mood);

        } else {

            selectedMood = null;

        }


        moodButton.textContent =
            selectedMood === null
                ? "－"
                : selectedMood;


        conditionInputs.forEach(
            function (input) {

                const conditionName =
                    input.dataset.condition;

                const condition =
                    record.condition || {};

                let value =
                    condition[conditionName];


                if (
                    conditionName === "irritation" &&
                    value === undefined
                ) {

                    value =
                        condition.irritability;

                }


                input.checked =
                    conditionIsChecked(value);

            }
        );


        memoInput.value =
            record.memo || "";

    }


    /* =================================================
       時刻
    ================================================= */

    function getCurrentTime() {

        const now =
            new Date();

        const hours =
            String(
                now.getHours()
            ).padStart(2, "0");

        const minutes =
            String(
                now.getMinutes()
            ).padStart(2, "0");

        return `${hours}:${minutes}`;

    }


    function openTimeMenu(
        menu,
        input,
        button
    ) {

        const willOpen =
            menu.hidden;

        closeAllMenus();

        if (!willOpen) {
            return;
        }

        const displayedTime =
            button.textContent.trim();

        input.value =
            displayedTime === "○○：○○"
                ? ""
                : displayedTime;

        menu.hidden = false;

    }


    function confirmTime(
        menu,
        input,
        button
    ) {

        const time =
            normalizeTimeInput(
                input.value
            );

        if (
            input.value.trim() !== "" &&
            time === null
        ) {

            showMessage(
                "時刻を00:00～23:59で入力してください",
                "error"
            );

            input.focus();

            return;

        }

        button.textContent =
            time ||
            "○○：○○";

        input.value =
            time || "";

        menu.hidden = true;

        hideMessage();

    }
    function normalizeTimeInput(value) {

        const text =
            value
                .trim()
                .replace(/[０-９]/g, function (digit) {

                    return String.fromCharCode(
                        digit.charCodeAt(0) - 65248
                    );

                })
                .replace(/：/g, ":");

        let hours;
        let minutes;

        /*
         * 「700」「2300」のように
         * 数字だけで入力した場合
         */
        if (/^\d{3,4}$/.test(text)) {

            hours =
                text.slice(0, -2);

            minutes =
                text.slice(-2);

        } else {

            /*
             * 「7:00」「23:00」のように
             * コロンを入れて入力した場合
             */
            const parts =
                text.match(
                    /^(\d{1,2}):(\d{1,2})$/
                );

            if (!parts) {
                return null;
            }

            hours =
                parts[1];

            minutes =
                parts[2];

        }

        const hourNumber =
            Number(hours);

        const minuteNumber =
            Number(minutes);

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

    /* =================================================
       ポップアップ
    ================================================= */

    function closeAllMenus() {

        dateMenu.hidden = true;
        bedtimeMenu.hidden = true;
        wakeTimeMenu.hidden = true;
        satisfactionMenu.hidden = true;
        moodMenu.hidden = true;

    }


    /* =================================================
       メッセージ
    ================================================= */

    function showMessage(
        message,
        type = "save"
    ) {

        window.clearTimeout(
            messageTimer
        );

        saveMessage.textContent =
            message;

        saveMessage.classList.toggle(
            "clear-message",
            type === "clear" ||
            type === "error"
        );

        saveMessage.classList.add(
            "show-message"
        );

        messageTimer =
            window.setTimeout(
                hideMessage,
                3000
            );

    }


    function hideMessage() {

        saveMessage.classList.remove(
            "show-message"
        );

        window.setTimeout(
            function () {

                if (
                    !saveMessage.classList.contains(
                        "show-message"
                    )
                ) {

                    saveMessage.textContent = "";

                    saveMessage.classList.remove(
                        "clear-message"
                    );

                }

            },
            250
        );

    }


    /* =================================================
       記録を保存
    ================================================= */

    function saveRecord() {

        records = readRecords();

        const condition = {};


        conditionInputs.forEach(
            function (input) {

                condition[
                    input.dataset.condition
                ] =
                    input.checked
                        ? "○"
                        : "";

            }
        );


        let bedtime =
            bedtimeButton
                .textContent
                .trim();

        let wakeTime =
            wakeTimeButton
                .textContent
                .trim();


        if (
            bedtime === "○○：○○"
        ) {

            bedtime = null;

        }


        if (
            wakeTime === "○○：○○"
        ) {

            wakeTime = null;

        }


        const previousRecord =
            records[selectedDate] || {};


        records[selectedDate] = {

            ...previousRecord,

            bedtimeDate:
                bedtime
                    ? selectedDate
                    : null,

            bedtime:
                bedtime,

            wakeDate:
                wakeTime
                    ? selectedDate
                    : null,

            wakeTime:
                wakeTime,

            sleepSatisfaction:
                selectedSatisfaction,

            mood:
                selectedMood === null
                    ? null
                    : Number(selectedMood),

            condition:
                condition,

            memo:
                memoInput
                    .value
                    .trim()

        };


        if (
            saveRecords()
        ) {

            showMessage(
                "記録しました"
            );

        }

    }


    /* =================================================
       選択日の記録を消去
    ================================================= */

    function clearSelectedRecord() {

        records = readRecords();

        const dateText =
            displayDate(selectedDate);

        const hasSavedRecord =
            Object.prototype
                .hasOwnProperty
                .call(
                    records,
                    selectedDate
                );


        const confirmed =
            window.confirm(
                `${dateText}の記録を消去しますか？\n` +
                "この操作は元に戻せません。"
            );


        if (!confirmed) {
            return;
        }


        if (hasSavedRecord) {

            delete records[selectedDate];

            if (
                !saveRecords()
            ) {

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


    /* =================================================
       睡眠時間
    ================================================= */

    function calculateSleepMinutes(
        bedtime,
        wakeTime
    ) {

        if (
            !bedtime ||
            !wakeTime
        ) {

            return null;

        }


        const bedtimeParts =
            bedtime
                .split(":")
                .map(Number);

        const wakeTimeParts =
            wakeTime
                .split(":")
                .map(Number);


        let bedtimeMinutes =
            bedtimeParts[0] * 60 +
            bedtimeParts[1];

        let wakeTimeMinutes =
            wakeTimeParts[0] * 60 +
            wakeTimeParts[1];


        if (
            wakeTimeMinutes <
            bedtimeMinutes
        ) {

            wakeTimeMinutes +=
                24 * 60;

        }


        return (
            wakeTimeMinutes -
            bedtimeMinutes
        );

    }


    function calculateSleepDuration(
        bedtime,
        wakeTime
    ) {

        const totalMinutes =
            calculateSleepMinutes(
                bedtime,
                wakeTime
            );


        if (
            totalMinutes === null
        ) {

            return "";

        }


        const hours =
            Math.floor(
                totalMinutes / 60
            );

        const minutes =
            totalMinutes % 60;


        return (
            `${hours}時間` +
            `${String(minutes)
                .padStart(2, "0")}分`
        );

    }


    function convertSleepTimeToHours(
        bedtime,
        wakeTime
    ) {

        const sleepMinutes =
            calculateSleepMinutes(
                bedtime,
                wakeTime
            );


        if (
            sleepMinutes === null
        ) {

            return null;

        }


        return Number(
            (
                sleepMinutes / 60
            ).toFixed(2)
        );

    }


    function formatSleepHours(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        const totalMinutes =
            Math.round(
                value * 60
            );

        const hours =
            Math.floor(
                totalMinutes / 60
            );

        const minutes =
            totalMinutes % 60;


        return (
            `${hours}時間` +
            `${String(minutes)
                .padStart(2, "0")}分`
        );

    }


    /* =================================================
       一覧表
    ================================================= */

    function getConditionMark(
        condition,
        name,
        oldName
    ) {

        if (!condition) {
            return "";
        }


        let value =
            condition[name];


        if (
            value === undefined &&
            oldName
        ) {

            value =
                condition[oldName];

        }


        return conditionIsChecked(value)
            ? "○"
            : "";

    }


    function createTableCell(
        row,
        value,
        className
    ) {

        const cell =
            document.createElement("td");

        cell.textContent =
            value ?? "";

        if (className) {

            cell.className =
                className;

        }

        row.appendChild(cell);

    }


    function setDefaultListPeriod() {

        records = readRecords();

        const dates =
            Object.keys(records)
                .sort();


        if (
            listStartDate.value &&
            listEndDate.value
        ) {

            return;

        }


        if (
            dates.length === 0
        ) {

            const today =
                formatDate(new Date());

            listStartDate.value =
                today;

            listEndDate.value =
                today;

            return;

        }


        listStartDate.value =
            dates[0];

        listEndDate.value =
            dates[
            dates.length - 1
            ];

    }


    function renderRecordsTable() {

        records = readRecords();

        const startDate =
            listStartDate.value;

        const endDate =
            listEndDate.value;


        recordsTableBody.innerHTML = "";


        if (
            startDate &&
            endDate &&
            startDate > endDate
        ) {

            noRecordsMessage.textContent =
                "開始日は終了日以前に設定してください";

            noRecordsMessage.hidden =
                false;

            return;

        }


        const dates =
            Object.keys(records)
                .filter(
                    function (date) {

                        return (
                            (!startDate ||
                                date >= startDate) &&
                            (!endDate ||
                                date <= endDate)
                        );

                    }
                )
                .sort();


        if (
            dates.length === 0
        ) {

            noRecordsMessage.textContent =
                "指定した期間に記録はありません";

            noRecordsMessage.hidden =
                false;

            return;

        }


        noRecordsMessage.hidden = true;


        dates.forEach(
            function (date) {

                const record =
                    records[date] || {};

                const condition =
                    record.condition || {};

                const row =
                    document.createElement("tr");


                createTableCell(
                    row,
                    formatTableDate(date)
                );

                createTableCell(
                    row,
                    record.bedtime || ""
                );

                createTableCell(
                    row,
                    record.wakeTime || ""
                );

                createTableCell(
                    row,
                    calculateSleepDuration(
                        record.bedtime,
                        record.wakeTime
                    )
                );

                createTableCell(
                    row,
                    record.sleepSatisfaction || ""
                );

                createTableCell(
                    row,
                    record.mood === 0 ||
                        record.mood
                        ? record.mood
                        : ""
                );

                const categoryACount =

                    Array.from(
                        {
                            length: 10
                        },
                        function (_, index) {

                            return (
                                `a${index + 1}`
                            );

                        }
                    )
                        .filter(
                            function (name) {

                                return conditionIsChecked(
                                    condition[name]
                                );

                            }
                        )
                        .length;


                const categoryBCount =

                    Array.from(
                        {
                            length: 10
                        },
                        function (_, index) {

                            return (
                                `b${index + 1}`
                            );

                        }
                    )
                        .filter(
                            function (name) {

                                return conditionIsChecked(
                                    condition[name]
                                );

                            }
                        )
                        .length;


                createTableCell(
                    row,
                    categoryACount
                );

                createTableCell(
                    row,
                    categoryBCount
                );

                createTableCell(
                    row,
                    record.memo || "",
                    "memo-cell"
                );


                recordsTableBody.appendChild(
                    row
                );

            }
        );

    }


    /* =================================================
       睡眠満足度を数値に変換
    ================================================= */

    function convertSatisfactionToNumber(
        satisfaction
    ) {

        const satisfactionValues = {

            "ほとんど眠れていない": 0,

            "あまり眠れていない": 1,

            "よく眠れた": 2,

            "とてもよく眠れた": 3

        };


        if (
            satisfactionValues[
            satisfaction
            ] === undefined
        ) {

            return null;

        }


        return satisfactionValues[
            satisfaction
        ];

    }


    /* =================================================
       推移グラフの表示期間
    ================================================= */

    function setDefaultTrendPeriod() {

        records = readRecords();

        const dates =
            Object.keys(records)
                .sort();


        if (
            trendStartDate.value &&
            trendEndDate.value
        ) {

            return;

        }


        if (
            dates.length === 0
        ) {

            const today =
                formatDate(new Date());

            trendStartDate.value =
                today;

            trendEndDate.value =
                today;

            return;

        }


        trendStartDate.value =
            dates[0];

        trendEndDate.value =
            dates[
            dates.length - 1
            ];

    }

    function convertTimeToHours(value) {

        if (!value) {
            return null;
        }

        const parts =
            value
                .split(":")
                .map(Number);

        if (
            parts.length !== 2 ||
            !Number.isFinite(parts[0]) ||
            !Number.isFinite(parts[1])
        ) {

            return null;

        }

        let time =
            parts[0] +
            parts[1] / 60;

        /*
         * 0:00～11:59は、
         * 翌日の時刻として24を加える
         */

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

        let totalMinutes =
            Math.round(
                Number(value) * 60
            );

        /*
         * 24時間を超えた数値を
         * 通常の時刻表示へ戻す
         */

        totalMinutes =
            (
                totalMinutes % (24 * 60) +
                24 * 60
            ) % (24 * 60);

        const hours =
            Math.floor(
                totalMinutes / 60
            );

        const minutes =
            totalMinutes % 60;

        return (
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}`
        );

    }

    /* =================================================
       グラフの共通設定
    ================================================= */

    function createChartOptions(
        minimum,
        maximum,
        stepSize,
        yAxisTitle
    ) {

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


    /* =================================================
       3つのグラフを作成
    ================================================= */

    function renderTrendCharts() {

        if (
            typeof Chart === "undefined"
        ) {

            window.alert(
                "グラフ機能を読み込めませんでした。通信環境を確認してください。"
            );

            return false;

        }


        records = readRecords();

        const startDate =
            trendStartDate.value;

        const endDate =
            trendEndDate.value;


        if (
            startDate &&
            endDate &&
            startDate > endDate
        ) {

            window.alert(
                "開始日は終了日以前に設定してください"
            );

            return false;

        }


        const dates =
            Object.keys(records)
                .filter(
                    function (date) {

                        return (
                            (!startDate ||
                                date >= startDate) &&
                            (!endDate ||
                                date <= endDate)
                        );

                    }
                )
                .sort();


        const labels =
            dates.map(
                function (date) {

                    return formatChartDate(date);

                }
            );

        const bedtimeValues =
            dates.map(
                function (date) {

                    const record =
                        records[date] || {};

                    return convertTimeToHours(
                        record.bedtime
                    );

                }
            );


        const wakeTimeValues =
            dates.map(
                function (date) {

                    const record =
                        records[date] || {};

                    return convertTimeToHours(
                        record.wakeTime
                    );

                }
            );


        const moodValues =
            dates.map(
                function (date) {

                    const record =
                        records[date] || {};


                    if (
                        record.mood === 0 ||
                        record.mood
                    ) {

                        return Number(
                            record.mood
                        );

                    }


                    return null;

                }
            );


        const satisfactionValues =
            dates.map(
                function (date) {

                    const record =
                        records[date] || {};

                    return convertSatisfactionToNumber(
                        record.sleepSatisfaction
                    );

                }
            );


        const categoryAValues =
            dates.map(
                function (date) {

                    const record =
                        records[date] || {};

                    const condition =
                        record.condition || {};

                    return checklistSettings
                        .categoryA
                        .items
                        .reduce(
                            function (total, itemName, index) {

                                const key =
                                    `a${index + 1}`;

                                return total +
                                    (
                                        conditionIsChecked(condition[key])
                                            ? 1
                                            : 0
                                    );

                            },
                            0
                        );

                }
            );


        const categoryBValues =
            dates.map(
                function (date) {

                    const record =
                        records[date] || {};

                    const condition =
                        record.condition || {};

                    return checklistSettings
                        .categoryB
                        .items
                        .reduce(
                            function (total, itemName, index) {

                                const key =
                                    `b${index + 1}`;

                                return total +
                                    (
                                        conditionIsChecked(condition[key])
                                            ? 1
                                            : 0
                                    );

                            },
                            0
                        );

                }
            );


        const categoryMaximum =
            Math.max(
                1,
                checklistSettings.categoryA.items.length,
                checklistSettings.categoryB.items.length,
                ...categoryAValues,
                ...categoryBValues
            );


        destroyTrendCharts();

        /* 就寝・起床時刻 */

        const sleepOptions =
            createChartOptions(
                12,
                36,
                1,
                "時刻"
            );


        sleepOptions
            .plugins
            .legend
            .display = true;


        sleepOptions
            .scales
            .y
            .ticks
            .callback = function (value) {

                return formatClockHours(
                    value
                );

            };


        sleepOptions
            .plugins
            .tooltip
            .callbacks = {

            label:
                function (context) {

                    return (
                        `${context.dataset.label}: ` +
                        formatClockHours(
                            context.parsed.y
                        )
                    );

                }

        };


        sleepChart =
            new Chart(
                sleepChartCanvas,
                {

                    type: "line",

                    data: {

                        labels: labels,

                        datasets: [

                            {

                                label:
                                    "就寝時刻",

                                data:
                                    bedtimeValues,

                                borderColor:
                                    "#4472c4",

                                backgroundColor:
                                    "#4472c4",

                                borderWidth:
                                    3,

                                pointRadius:
                                    4,

                                pointHoverRadius:
                                    6,

                                tension:
                                    0.15,

                                spanGaps:
                                    false

                            },

                            {

                                label:
                                    "起床時刻",

                                data:
                                    wakeTimeValues,

                                borderColor:
                                    "#ed7d31",

                                backgroundColor:
                                    "#ed7d31",

                                borderWidth:
                                    3,

                                pointRadius:
                                    4,

                                pointHoverRadius:
                                    6,

                                tension:
                                    0.15,

                                spanGaps:
                                    false

                            }

                        ]

                    },

                    options:
                        sleepOptions

                }
            );


        /* 気分 */

        moodChart =
            new Chart(
                moodChartCanvas,
                {

                    type: "line",

                    data: {

                        labels: labels,

                        datasets: [

                            {

                                data:
                                    moodValues,

                                borderColor:
                                    "#70ad47",

                                backgroundColor:
                                    "#70ad47",

                                borderWidth:
                                    3,

                                pointRadius:
                                    4,

                                pointHoverRadius:
                                    6,

                                tension:
                                    0.15,

                                spanGaps:
                                    false

                            }

                        ]

                    },

                    options:
                        createChartOptions(
                            -3,
                            3,
                            1,
                            "気分"
                        )

                }
            );


        /* 睡眠満足度 */

        satisfactionChart =
            new Chart(
                satisfactionChartCanvas,
                {

                    type: "line",

                    data: {

                        labels: labels,

                        datasets: [

                            {

                                data:
                                    satisfactionValues,

                                borderColor:
                                    "#ffc000",

                                backgroundColor:
                                    "#ffc000",

                                borderWidth:
                                    3,

                                pointRadius:
                                    4,

                                pointHoverRadius:
                                    6,

                                tension:
                                    0.15,

                                spanGaps:
                                    false

                            }

                        ]

                    },

                    options:
                        createChartOptions(
                            0,
                            3,
                            1,
                            "睡眠満足度"
                        )

                }
            );


        /* カテゴリーA・Bの合計値 */

        const categoryOptions =
            createChartOptions(
                0,
                categoryMaximum,
                1,
                "チェック数"
            );


        categoryOptions
            .plugins
            .legend
            .display = true;


        categoryOptions
            .plugins
            .tooltip
            .displayColors = true;


        categoryChart =
            new Chart(
                categoryChartCanvas,
                {

                    type: "line",

                    data: {

                        labels: labels,

                        datasets: [

                            {

                                label:
                                    checklistSettings.categoryA.name,

                                data:
                                    categoryAValues,

                                borderColor:
                                    "#4472c4",

                                backgroundColor:
                                    "#4472c4",

                                borderWidth:
                                    3,

                                pointRadius:
                                    4,

                                pointHoverRadius:
                                    6,

                                tension:
                                    0.15,

                                spanGaps:
                                    false

                            },

                            {

                                label:
                                    checklistSettings.categoryB.name,

                                data:
                                    categoryBValues,

                                borderColor:
                                    "#ed7d31",

                                backgroundColor:
                                    "#ed7d31",

                                borderWidth:
                                    3,

                                pointRadius:
                                    4,

                                pointHoverRadius:
                                    6,

                                tension:
                                    0.15,

                                spanGaps:
                                    false

                            }

                        ]

                    },

                    options:
                        categoryOptions

                }
            );


        return true;

    }


    /* =================================================
       ページ切替
    ================================================= */

    function hideAllPages() {

        recordPage.hidden = true;
        listPage.hidden = true;
        trendPage.hidden = true;


        recordNavButton
            .classList
            .remove("active");

        listNavButton
            .classList
            .remove("active");

        trendNavButton
            .classList
            .remove("active");

    }


    function showRecordPage() {

        closeAllMenus();

        hideAllPages();


        recordPage.hidden = false;

        recordActionBar.hidden = false;

        document.body
            .classList
            .add("record-view");

        recordNavButton
            .classList
            .add("active");


        window.scrollTo(
            0,
            0
        );

    }


    function showListPage() {

        closeAllMenus();

        hideAllPages();


        recordActionBar.hidden = true;

        document.body
            .classList
            .remove("record-view");


        listPage.hidden = false;

        listNavButton
            .classList
            .add("active");


        setDefaultListPeriod();

        renderRecordsTable();


        window.scrollTo(
            0,
            0
        );

    }


    function showTrendPage() {

        closeAllMenus();

        hideAllPages();


        recordActionBar.hidden = true;

        document.body
            .classList
            .remove("record-view");


        trendPage.hidden = false;

        trendNavButton
            .classList
            .add("active");


        setDefaultTrendPeriod();

        renderTrendCharts();


        window.scrollTo(
            0,
            0
        );

    }
    /* =================================================
       体調チェックの設定
    ================================================= */

    function fillSettingsForm() {

        categoryAName.value =
            checklistSettings
                .categoryA
                .name;

        categoryBName.value =
            checklistSettings
                .categoryB
                .name;


        const categories = [

            [
                categoryASettings,
                checklistSettings.categoryA
            ],

            [
                categoryBSettings,
                checklistSettings.categoryB
            ]

        ];


        categories.forEach(
            function (categoryData) {

                const container =
                    categoryData[0];

                const category =
                    categoryData[1];


                container.innerHTML = "";


                category.items.forEach(
                    function (
                        itemName,
                        index
                    ) {

                        const label =
                            document.createElement(
                                "label"
                            );

                        label.className =
                            "item-setting";


                        const number =
                            document.createElement(
                                "span"
                            );

                        number.textContent =
                            `${index + 1}.`;


                        const input =
                            document.createElement(
                                "input"
                            );

                        input.type =
                            "text";

                        input.maxLength =
                            40;

                        input.value =
                            itemName;


                        label.append(
                            number,
                            input
                        );

                        container.appendChild(
                            label
                        );

                    }
                );

            }
        );

    }


    function closeSettings() {

        settingsModal.hidden =
            true;

    }


    settingsButton.addEventListener(
        "click",
        function () {

            fillSettingsForm();

            settingsModal.hidden =
                false;

        }
    );


    settingsCancel.addEventListener(
        "click",
        closeSettings
    );


    settingsModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                settingsModal
            ) {

                closeSettings();

            }

        }
    );


    settingsSave.addEventListener(
        "click",
        function () {

            function getItems(
                container
            ) {

                return [
                    ...container
                        .querySelectorAll(
                            "input"
                        )
                ].map(
                    function (
                        input,
                        index
                    ) {

                        return (
                            input
                                .value
                                .trim() ||
                            `項目${index + 1}`
                        );

                    }
                );

            }


            checklistSettings = {

                categoryA: {

                    name:
                        categoryAName
                            .value
                            .trim() ||
                        "カテゴリーA",

                    items:
                        getItems(
                            categoryASettings
                        )

                },

                categoryB: {

                    name:
                        categoryBName
                            .value
                            .trim() ||
                        "カテゴリーB",

                    items:
                        getItems(
                            categoryBSettings
                        )

                }

            };


            try {

                localStorage.setItem(
                    SETTINGS_KEY,
                    JSON.stringify(
                        checklistSettings
                    )
                );

            } catch (error) {

                showMessage(
                    "設定を保存できませんでした",
                    "error"
                );

                return;

            }


            renderChecklist();


            conditionInputs = [
                ...document.querySelectorAll(
                    "[data-condition]"
                )
            ];


            loadSelectedRecord();

            closeSettings();


            showMessage(
                "設定を保存しました"
            );

        }
    );

    /* =================================================
       日付イベント
    ================================================= */

    editDateButton.addEventListener(
        "click",
        function () {

            const willOpen =
                dateMenu.hidden;

            closeAllMenus();


            if (willOpen) {

                editDateInput.value =
                    selectedDate;

                dateMenu.hidden = false;

            }

        }
    );


    document
        .getElementById("previous-day")
        .addEventListener(
            "click",
            function () {

                moveDate(-1);

            }
        );


    document
        .getElementById("next-day")
        .addEventListener(
            "click",
            function () {

                moveDate(1);

            }
        );


    document
        .getElementById("today-button")
        .addEventListener(
            "click",
            function () {

                editDateInput.value =
                    formatDate(new Date());

            }
        );


    document
        .getElementById("tomorrow-button")
        .addEventListener(
            "click",
            function () {

                const tomorrow =
                    new Date();

                tomorrow.setDate(
                    tomorrow.getDate() + 1
                );

                editDateInput.value =
                    formatDate(tomorrow);

            }
        );


    document
        .getElementById("date-cancel")
        .addEventListener(
            "click",
            function () {

                editDateInput.value =
                    selectedDate;

                dateMenu.hidden = true;

            }
        );


    document
        .getElementById("date-confirm")
        .addEventListener(
            "click",
            function () {

                changeSelectedDate(
                    editDateInput.value
                );

                dateMenu.hidden = true;

            }
        );


    /* =================================================
       就寝時刻イベント
    ================================================= */

    bedtimeButton.addEventListener(
        "click",
        function () {

            openTimeMenu(
                bedtimeMenu,
                bedtimeInput,
                bedtimeButton
            );

        }
    );


    document
        .getElementById("bedtime-now")
        .addEventListener(
            "click",
            function () {

                bedtimeInput.value =
                    getCurrentTime();

            }
        );


    document
        .getElementById("bedtime-cancel")
        .addEventListener(
            "click",
            function () {

                bedtimeMenu.hidden = true;

            }
        );


    document
        .getElementById("bedtime-confirm")
        .addEventListener(
            "click",
            function () {

                confirmTime(
                    bedtimeMenu,
                    bedtimeInput,
                    bedtimeButton
                );

            }
        );


    /* =================================================
       起床時刻イベント
    ================================================= */

    wakeTimeButton.addEventListener(
        "click",
        function () {

            openTimeMenu(
                wakeTimeMenu,
                wakeTimeInput,
                wakeTimeButton
            );

        }
    );


    document
        .getElementById("wake-time-now")
        .addEventListener(
            "click",
            function () {

                wakeTimeInput.value =
                    getCurrentTime();

            }
        );


    document
        .getElementById("wake-time-cancel")
        .addEventListener(
            "click",
            function () {

                wakeTimeMenu.hidden = true;

            }
        );


    document
        .getElementById("wake-time-confirm")
        .addEventListener(
            "click",
            function () {

                confirmTime(
                    wakeTimeMenu,
                    wakeTimeInput,
                    wakeTimeButton
                );

            }
        );


    /* =================================================
       睡眠満足度
    ================================================= */

    satisfactionButton.addEventListener(
        "click",
        function () {

            const willOpen =
                satisfactionMenu.hidden;

            closeAllMenus();

            satisfactionMenu.hidden =
                !willOpen;

        }
    );


    satisfactionMenu.addEventListener(
        "click",
        function (event) {

            const option =
                event.target.closest(
                    "button[data-value]"
                );

            if (!option) {
                return;
            }


            selectedSatisfaction =
                option.dataset.value;

            satisfactionButton.textContent =
                selectedSatisfaction;

            satisfactionMenu.hidden = true;

            hideMessage();

        }
    );


    /* =================================================
       気分
    ================================================= */

    moodButton.addEventListener(
        "click",
        function () {

            const willOpen =
                moodMenu.hidden;

            closeAllMenus();

            moodMenu.hidden =
                !willOpen;

        }
    );


    moodMenu.addEventListener(
        "click",
        function (event) {

            const option =
                event.target.closest(
                    "button[data-value]"
                );

            if (!option) {
                return;
            }


            selectedMood =
                option.dataset.value;

            moodButton.textContent =
                selectedMood;

            moodMenu.hidden = true;

            hideMessage();

        }
    );


    /* =================================================
       記録・クリア
    ================================================= */

    clearButton.addEventListener(
        "click",
        clearSelectedRecord
    );


    saveButton.addEventListener(
        "click",
        saveRecord
    );


    /* =================================================
       ページ切替イベント
    ================================================= */

    recordNavButton.addEventListener(
        "click",
        showRecordPage
    );


    listNavButton.addEventListener(
        "click",
        showListPage
    );


    trendNavButton.addEventListener(
        "click",
        showTrendPage
    );


    /* =================================================
       一覧画面イベント
    ================================================= */

    if (updateListButton) {

        updateListButton.addEventListener(
            "click",
            renderRecordsTable
        );

    }


    if (printButton) {

        printButton.addEventListener(
            "click",
            function () {

                renderRecordsTable();

                window.print();

            }
        );

    }


    /* =================================================
       推移グラフの更新
    ================================================= */

    if (updateTrendButton) {

        updateTrendButton.addEventListener(
            "click",
            renderTrendCharts
        );

    }


    /* =================================================
       推移グラフをPDF印刷
    ================================================= */

    if (trendPrintButton) {

        trendPrintButton.addEventListener(
            "click",
            function () {

                const rendered =
                    renderTrendCharts();


                if (!rendered) {
                    return;
                }


                document.body
                    .classList
                    .add("trend-print");


                /*
                 * スマホからの印刷では、
                 * 1ページ用の専用サイズを使用する
                 */

                document.body
                    .classList
                    .toggle(
                        "mobile-trend-print",
                        window.matchMedia(
                            "(max-width: 768px)"
                        ).matches
                    );


                /*
                 * 推移グラフはA4縦向き
                 */

                let pageStyle =
                    document.getElementById(
                        "trend-print-page-style"
                    );


                if (!pageStyle) {

                    pageStyle =
                        document.createElement(
                            "style"
                        );

                    pageStyle.id =
                        "trend-print-page-style";

                    document.head.appendChild(
                        pageStyle
                    );

                }


                pageStyle.textContent =
                    "@page {" +
                    "size: A4 portrait;" +
                    "margin: 5mm;" +
                    "}";


                window.setTimeout(
                    function () {

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


                        window.setTimeout(
                            function () {

                                window.print();

                            },
                            150
                        );

                    },
                    150
                );

            }
        );

    }


    /* =================================================
       印刷後に通常表示へ戻す
    ================================================= */

    window.addEventListener(
        "afterprint",
        function () {

            document.body
                .classList
                .remove("trend-print");


            document.body
                .classList
                .remove(
                    "mobile-trend-print"
                );


            const pageStyle =
                document.getElementById(
                    "trend-print-page-style"
                );


            if (pageStyle) {

                pageStyle.remove();

            }


            window.setTimeout(
                function () {

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

                },
                100
            );

        }
    );


    /* =================================================
       枠外クリック
    ================================================= */

    document.addEventListener(
        "click",
        function (event) {

            const clickedInside =
                dateMenu.contains(
                    event.target
                ) ||
                bedtimeMenu.contains(
                    event.target
                ) ||
                wakeTimeMenu.contains(
                    event.target
                ) ||
                satisfactionMenu.contains(
                    event.target
                ) ||
                moodMenu.contains(
                    event.target
                );


            const clickedButton =
                event.target ===
                editDateButton ||
                event.target ===
                bedtimeButton ||
                event.target ===
                wakeTimeButton ||
                event.target ===
                satisfactionButton ||
                event.target ===
                moodButton;


            if (
                !clickedInside &&
                !clickedButton
            ) {

                closeAllMenus();

            }

        }
    );


    /* =================================================
       初期表示
    ================================================= */

    changeSelectedDate(
        selectedDate
    );

    showRecordPage();

});
