const form = document.getElementById("predictionForm");
const result = document.getElementById("result");
const estimatedTime = document.getElementById("estimatedTime");
const resultDetails = document.getElementById("resultDetails");
const saveDeviceButton = document.getElementById("saveDevice");
const resetFormButton = document.getElementById("resetForm");
const themeToggleButton = document.getElementById("themeToggle");
const clearHistoryButton = document.getElementById("clearHistory");
const savedDevices = document.getElementById("savedDevices");
const historyList = document.getElementById("historyList");
const progressStart = document.getElementById("progressStart");
const progressGoal = document.getElementById("progressGoal");
const progressFill = document.getElementById("progressFill");

const devicesStorageKey = "chargingPredictionDevices";
const historyStorageKey = "chargingPredictionHistory";
const themeStorageKey = "chargingPredictionTheme";

const defaultValues = {
  deviceName: "My Device",
  sampleStart: "10",
  sampleMinutes: "60",
  sampleEnd: "75",
  currentPercent: "15",
  goalPercent: "90",
};

const fields = {
  deviceName: document.getElementById("deviceName"),
  sampleStart: document.getElementById("sampleStart"),
  sampleMinutes: document.getElementById("sampleMinutes"),
  sampleEnd: document.getElementById("sampleEnd"),
  currentPercent: document.getElementById("currentPercent"),
  goalPercent: document.getElementById("goalPercent"),
};

function getNumber(field) {
  return Number(field.value);
}

function readStorage(key, fallback) {
  const saved = localStorage.getItem(key);

  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function getSavedDevices() {
  return readStorage(devicesStorageKey, []);
}

function setSavedDevices(devices) {
  localStorage.setItem(devicesStorageKey, JSON.stringify(devices));
}

function getHistory() {
  return readStorage(historyStorageKey, []);
}

function setHistory(history) {
  localStorage.setItem(historyStorageKey, JSON.stringify(history));
}

function formatMinutes(totalMinutes) {
  const roundedMinutes = Math.ceil(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  }

  if (minutes === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"}`;
}

function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function updateProgress(currentPercent, goalPercent) {
  const progressWidth = Math.min(Math.max(goalPercent - currentPercent, 0), 100);
  progressStart.textContent = `${currentPercent}%`;
  progressGoal.textContent = `${goalPercent}% goal`;
  progressFill.style.width = `${progressWidth}%`;
}

function showError(message) {
  result.classList.add("error");
  estimatedTime.textContent = "Check inputs";
  resultDetails.textContent = message;
  updateProgress(getNumber(fields.currentPercent) || 0, getNumber(fields.goalPercent) || 0);
  return null;
}

function calculatePrediction() {
  const deviceName = fields.deviceName.value.trim() || "This device";
  const sampleStart = getNumber(fields.sampleStart);
  const sampleMinutes = getNumber(fields.sampleMinutes);
  const sampleEnd = getNumber(fields.sampleEnd);
  const currentPercent = getNumber(fields.currentPercent);
  const goalPercent = getNumber(fields.goalPercent);

  updateProgress(currentPercent, goalPercent);

  if (sampleStart < 0 || sampleStart > 99 || sampleEnd < 1 || sampleEnd > 100) {
    return showError("Example percentages must stay between 0% and 100%.");
  }

  if (currentPercent < 0 || currentPercent > 99 || goalPercent < 1 || goalPercent > 100) {
    return showError("Target percentages must stay between 0% and 100%.");
  }

  if (sampleEnd <= sampleStart) {
    return showError("The example ending percent must be higher than the starting percent.");
  }

  if (goalPercent <= currentPercent) {
    return showError("The goal percent must be higher than the current battery percent.");
  }

  if (sampleMinutes <= 0) {
    return showError("Charging minutes must be greater than zero.");
  }

  const gainedPercent = sampleEnd - sampleStart;
  const percentPerMinute = gainedPercent / sampleMinutes;
  const neededPercent = goalPercent - currentPercent;
  const predictedMinutes = neededPercent / percentPerMinute;
  const formattedTime = formatMinutes(predictedMinutes);

  result.classList.remove("error");
  estimatedTime.textContent = formattedTime;
  resultDetails.textContent = `${deviceName} charges about ${percentPerMinute.toFixed(2)}% per minute. Need ${neededPercent}% more to reach ${goalPercent}%.`;

  return {
    deviceName,
    currentPercent,
    goalPercent,
    percentPerMinute,
    neededPercent,
    predictedMinutes,
    formattedTime,
  };
}

function getCurrentDeviceData() {
  return {
    id: `device-${Date.now()}`,
    name: fields.deviceName.value.trim(),
    sampleStart: fields.sampleStart.value,
    sampleMinutes: fields.sampleMinutes.value,
    sampleEnd: fields.sampleEnd.value,
  };
}

function applyDevice(device) {
  fields.deviceName.value = device.name;
  fields.sampleStart.value = device.sampleStart;
  fields.sampleMinutes.value = device.sampleMinutes;
  fields.sampleEnd.value = device.sampleEnd;
  calculatePrediction();
}

function editDevice(device) {
  applyDevice(device);
  fields.deviceName.focus();
}

function renderSavedDevices() {
  const devices = getSavedDevices();
  savedDevices.innerHTML = "";

  if (devices.length === 0) {
    savedDevices.innerHTML = '<p class="empty-state">No saved devices yet.</p>';
    return;
  }

  devices.forEach((device) => {
    const gainedPercent = Number(device.sampleEnd) - Number(device.sampleStart);
    const rate = gainedPercent / Number(device.sampleMinutes);
    const card = document.createElement("article");
    const info = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const loadButton = document.createElement("button");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    card.className = "device-card";
    title.textContent = device.name;
    meta.textContent = `${rate.toFixed(2)}% per minute`;
    loadButton.className = "small-button secondary-button";
    loadButton.type = "button";
    loadButton.textContent = "Use";
    editButton.className = "small-button ghost-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    deleteButton.className = "small-button delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    loadButton.addEventListener("click", () => applyDevice(device));
    editButton.addEventListener("click", () => editDevice(device));
    deleteButton.addEventListener("click", () => {
      setSavedDevices(devices.filter((savedDevice) => savedDevice.id !== device.id));
      renderSavedDevices();
    });

    info.append(title, meta);
    card.append(info, loadButton, editButton, deleteButton);
    savedDevices.append(card);
  });
}

function saveCurrentDevice() {
  const device = getCurrentDeviceData();

  if (!device.name) {
    showError("Add a device name before saving.");
    return;
  }

  const sampleStart = Number(device.sampleStart);
  const sampleEnd = Number(device.sampleEnd);
  const sampleMinutes = Number(device.sampleMinutes);

  if (sampleEnd <= sampleStart || sampleMinutes <= 0) {
    calculatePrediction();
    return;
  }

  const devices = getSavedDevices();
  const existingDeviceIndex = devices.findIndex((savedDevice) => savedDevice.name.toLowerCase() === device.name.toLowerCase());

  if (existingDeviceIndex >= 0) {
    devices[existingDeviceIndex] = { ...device, id: devices[existingDeviceIndex].id };
  } else {
    devices.unshift(device);
  }

  setSavedDevices(devices);
  renderSavedDevices();
  calculatePrediction();
}

function savePredictionHistory(prediction) {
  if (!prediction) {
    return;
  }

  const history = getHistory();
  history.unshift({
    id: `history-${Date.now()}`,
    createdAt: new Date().toISOString(),
    deviceName: prediction.deviceName,
    currentPercent: prediction.currentPercent,
    goalPercent: prediction.goalPercent,
    formattedTime: prediction.formattedTime,
    rate: prediction.percentPerMinute.toFixed(2),
  });

  setHistory(history.slice(0, 8));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No predictions yet.</p>';
    return;
  }

  history.forEach((item) => {
    const entry = document.createElement("article");
    const title = document.createElement("strong");
    const meta = document.createElement("span");

    entry.className = "history-item";
    title.textContent = `${item.deviceName}: ${item.formattedTime}`;
    meta.textContent = `${item.currentPercent}% to ${item.goalPercent}% at ${item.rate}% per minute - ${formatDateTime(item.createdAt)}`;

    entry.append(title, meta);
    historyList.append(entry);
  });
}

function resetForm() {
  Object.entries(defaultValues).forEach(([key, value]) => {
    fields[key].value = value;
  });
  calculatePrediction();
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  themeToggleButton.textContent = isDark ? "Light" : "Dark";
  themeToggleButton.setAttribute("aria-pressed", String(isDark));
  localStorage.setItem(themeStorageKey, theme);
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
  applyTheme(nextTheme);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  savePredictionHistory(calculatePrediction());
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", calculatePrediction);
});

saveDeviceButton.addEventListener("click", saveCurrentDevice);
resetFormButton.addEventListener("click", resetForm);
themeToggleButton.addEventListener("click", toggleTheme);
clearHistoryButton.addEventListener("click", () => {
  setHistory([]);
  renderHistory();
});

applyTheme(localStorage.getItem(themeStorageKey) || "dark");
renderSavedDevices();
renderHistory();
calculatePrediction();
