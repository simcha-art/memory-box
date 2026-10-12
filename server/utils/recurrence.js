export const REPEAT_TYPES = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

const MAX_STEPS = 5000;

function getParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Converts a wall-clock time in the given timezone to a real UTC Date.
function zonedTimeToUtc(wall, timeZone) {
  const target = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  let guess = target;
  for (let i = 0; i < 2; i += 1) {
    const actual = getParts(new Date(guess), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    guess += target - actualAsUtc;
  }
  return new Date(guess);
}

function safeTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

function addSteps(start, repeat, steps, timeZone) {
  const wall = getParts(start, timeZone);
  let year = wall.year;
  let month = wall.month;
  let day = wall.day;

  if (repeat === 'daily' || repeat === 'weekly') {
    const shifted = new Date(Date.UTC(year, month - 1, day + steps * (repeat === 'weekly' ? 7 : 1)));
    year = shifted.getUTCFullYear();
    month = shifted.getUTCMonth() + 1;
    day = shifted.getUTCDate();
  } else {
    const monthsToAdd = repeat === 'yearly' ? steps * 12 : steps;
    const totalMonths = year * 12 + (month - 1) + monthsToAdd;
    year = Math.floor(totalMonths / 12);
    month = (totalMonths % 12) + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    day = Math.min(day, lastDay);
  }

  return zonedTimeToUtc({ ...wall, year, month, day }, timeZone);
}

export function nextOccurrence({ reminderDate, repeat, timezone }, now = new Date()) {
  if (!repeat || repeat === 'none' || !REPEAT_TYPES.includes(repeat)) return null;
  const start = new Date(reminderDate);
  if (Number.isNaN(start.getTime())) return null;
  const timeZone = safeTimeZone(timezone || 'UTC');

  for (let steps = 1; steps <= MAX_STEPS; steps += 1) {
    const candidate = addSteps(start, repeat, steps, timeZone);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}