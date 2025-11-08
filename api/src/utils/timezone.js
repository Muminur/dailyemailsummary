import { DateTime } from 'luxon'

export function getTodayInDhaka() {
  return DateTime.now().setZone('Asia/Dhaka').toISODate()
}

export function getDhakaDateFromString(dateStr) {
  // If no date provided, use today in Dhaka
  if (!dateStr) return getTodayInDhaka()
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }
  return dateStr
}