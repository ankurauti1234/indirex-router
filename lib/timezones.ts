export interface TimezoneOption {
  label: string
  value: string
  iana: string
}

export const timezones: TimezoneOption[] = [
  { label: "(UTC) Coordinated Universal Time", value: "UTC", iana: "UTC" },
  { label: "(UTC-12:00) International Date Line West", value: "UTC-12", iana: "Etc/GMT+12" },
  { label: "(UTC-11:00) Coordinated Universal Time-11", value: "UTC-11", iana: "Etc/GMT+11" },
  { label: "(UTC-10:00) Hawaii", value: "UTC-10", iana: "Pacific/Honolulu" },
  { label: "(UTC-09:00) Alaska", value: "UTC-09", iana: "America/Anchorage" },
  { label: "(UTC-08:00) Baja California", value: "UTC-08", iana: "America/Tijuana" },
  { label: "(UTC-08:00) Pacific Standard Time (US & Canada)", value: "PST", iana: "America/Los_Angeles" },
  { label: "(UTC-07:00) Arizona", value: "UTC-07-AZ", iana: "America/Phoenix" },
  { label: "(UTC-07:00) Chihuahua, La Paz, Mazatlan", value: "UTC-07-MX", iana: "America/Mazatlan" },
  { label: "(UTC-07:00) Mountain Time (US & Canada)", value: "MST", iana: "America/Denver" },
  { label: "(UTC-06:00) Central America", value: "UTC-06", iana: "America/Guatemala" },
  { label: "(UTC-06:00) Central Time (US & Canada)", value: "CST", iana: "America/Chicago" },
  { label: "(UTC-06:00) Guadalajara, Mexico City, Monterrey", value: "UTC-06-MX", iana: "America/Mexico_City" },
  { label: "(UTC-06:00) Saskatchewan", value: "UTC-06-CA", iana: "America/Regina" },
  { label: "(UTC-05:00) Bogota, Lima, Quito, Rio Branco", value: "UTC-05", iana: "America/Bogota" },
  { label: "(UTC-05:00) Eastern Time (US & Canada)", value: "EST", iana: "America/New_York" },
  { label: "(UTC-05:00) Indiana (East)", value: "EST-IN", iana: "America/Indiana/Indianapolis" },
  { label: "(UTC-04:00) Atlantic Time (Canada)", value: "AST", iana: "America/Halifax" },
  { label: "(UTC-04:00) Caracas, La Paz", value: "UTC-04", iana: "America/Caracas" },
  { label: "(UTC-04:00) Manaus", value: "UTC-04-BR", iana: "America/Manaus" },
  { label: "(UTC-04:00) Santiago", value: "UTC-04-CL", iana: "America/Santiago" },
  { label: "(UTC-03:30) Newfoundland", value: "NST", iana: "America/St_Johns" },
  { label: "(UTC-03:00) Brasilia", value: "UTC-03-BR", iana: "America/Sao_Paulo" },
  { label: "(UTC-03:00) Buenos Aires, Georgetown", value: "UTC-03-AR", iana: "America/Argentina/Buenos_Aires" },
  { label: "(UTC-03:00) Greenland", value: "UTC-03-GL", iana: "America/Godthab" },
  { label: "(UTC-03:00) Montevideo", value: "UTC-03-UY", iana: "America/Montevideo" },
  { label: "(UTC-02:00) Mid-Atlantic", value: "UTC-02", iana: "Etc/GMT+2" },
  { label: "(UTC-01:00) Azores", value: "UTC-01-AZ", iana: "Atlantic/Azores" },
  { label: "(UTC-01:00) Cape Verde Is.", value: "UTC-01", iana: "Atlantic/Cape_Verde" },
  { label: "(UTC+00:00) Casablanca", value: "UTC+00", iana: "Africa/Casablanca" },
  { label: "(UTC+00:00) Dublin, Edinburgh, Lisbon, London", value: "GMT", iana: "Europe/London" },
  { label: "(UTC+00:00) Monrovia, Reykjavik", value: "UTC+00-IS", iana: "Atlantic/Reykjavik" },
  { label: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna", value: "CET", iana: "Europe/Berlin" },
  { label: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague", value: "CET-EE", iana: "Europe/Prague" },
  { label: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris", value: "CET-WE", iana: "Europe/Paris" },
  { label: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb", value: "CET-YU", iana: "Europe/Warsaw" },
  { label: "(UTC+01:00) West Central Africa", value: "WAT", iana: "Africa/Lagos" },
  { label: "(UTC+02:00) Amman", value: "EET-JO", iana: "Asia/Amman" },
  { label: "(UTC+02:00) Athens, Bucharest, Istanbul", value: "EET", iana: "Europe/Athens" },
  { label: "(UTC+02:00) Beirut", value: "EET-LB", iana: "Asia/Beirut" },
  { label: "(UTC+02:00) Cairo", value: "EET-EG", iana: "Africa/Cairo" },
  { label: "(UTC+02:00) Harare, Pretoria", value: "CAT", iana: "Africa/Johannesburg" },
  { label: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius", value: "EET-FI", iana: "Europe/Helsinki" },
  { label: "(UTC+02:00) Jerusalem", value: "IST", iana: "Asia/Jerusalem" },
  { label: "(UTC+02:00) Minsk", value: "MSK-M", iana: "Europe/Minsk" },
  { label: "(UTC+02:00) Windhoek", value: "WAT-NA", iana: "Africa/Windhoek" },
  { label: "(UTC+03:00) Baghdad", value: "AST-IQ", iana: "Asia/Baghdad" },
  { label: "(UTC+03:00) Kuwait, Riyadh", value: "AST-SA", iana: "Asia/Riyadh" },
  { label: "(UTC+03:00) Moscow, St. Petersburg, Volgograd", value: "MSK", iana: "Europe/Moscow" },
  { label: "(UTC+03:00) Nairobi", value: "EAT", iana: "Africa/Nairobi" },
  { label: "(UTC+03:30) Tehran", value: "IRST", iana: "Asia/Tehran" },
  { label: "(UTC+04:00) Abu Dhabi, Muscat", value: "GST", iana: "Asia/Dubai" },
  { label: "(UTC+04:00) Baku", value: "AZT", iana: "Asia/Baku" },
  { label: "(UTC+04:00) Port Louis", value: "MUT", iana: "Indian/Mauritius" },
  { label: "(UTC+04:00) Tbilisi", value: "GET", iana: "Asia/Tbilisi" },
  { label: "(UTC+04:00) Yerevan", value: "AMT", iana: "Asia/Yerevan" },
  { label: "(UTC+04:30) Kabul", value: "AFT", iana: "Asia/Kabul" },
  { label: "(UTC+05:00) Ekaterinburg", value: "YEKT", iana: "Asia/Yekaterinburg" },
  { label: "(UTC+05:00) Islamabad, Karachi, Tashkent", value: "PKT", iana: "Asia/Karachi" },
  { label: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi", value: "IST-IN", iana: "Asia/Kolkata" },
  { label: "(UTC+05:45) Kathmandu", value: "NPT", iana: "Asia/Kathmandu" },
  { label: "(UTC+06:00) Almaty, Novosibirsk", value: "ALMT", iana: "Asia/Almaty" },
  { label: "(UTC+06:00) Astana, Dhaka", value: "BST", iana: "Asia/Dhaka" },
  { label: "(UTC+06:30) Yangon (Rangoon)", value: "MMT", iana: "Asia/Yangon" },
  { label: "(UTC+07:00) Bangkok, Hanoi, Jakarta", value: "ICT", iana: "Asia/Bangkok" },
  { label: "(UTC+07:00) Krasnoyarsk", value: "KRAT", iana: "Asia/Krasnoyarsk" },
  { label: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi", value: "CST-CN", iana: "Asia/Shanghai" },
  { label: "(UTC+08:00) Kuala Lumpur, Singapore", value: "SGT", iana: "Asia/Singapore" },
  { label: "(UTC+08:00) Irkutsk", value: "IRKT", iana: "Asia/Irkutsk" },
  { label: "(UTC+08:00) Perth", value: "AWST", iana: "Australia/Perth" },
  { label: "(UTC+08:00) Taipei", value: "NST-TW", iana: "Asia/Taipei" },
  { label: "(UTC+08:00) Ulaanbaatar", value: "ULAT", iana: "Asia/Ulaanbaatar" },
  { label: "(UTC+09:00) Osaka, Sapporo, Tokyo", value: "JST", iana: "Asia/Tokyo" },
  { label: "(UTC+09:00) Seoul", value: "KST", iana: "Asia/Seoul" },
  { label: "(UTC+09:00) Yakutsk", value: "YAKT", iana: "Asia/Yakutsk" },
  { label: "(UTC+09:30) Adelaide", value: "ACDT", iana: "Australia/Adelaide" },
  { label: "(UTC+09:30) Darwin", value: "ACST", iana: "Australia/Darwin" },
  { label: "(UTC+10:00) Brisbane", value: "AEST-QLD", iana: "Australia/Brisbane" },
  { label: "(UTC+10:00) Canberra, Melbourne, Sydney", value: "AEST", iana: "Australia/Sydney" },
  { label: "(UTC+10:00) Hobart", value: "AEDT", iana: "Australia/Hobart" },
  { label: "(UTC+10:00) Guam, Port Moresby", value: "ChST", iana: "Pacific/Guam" },
  { label: "(UTC+10:00) Vladivostok", value: "VLAT", iana: "Asia/Vladivostok" },
  { label: "(UTC+11:00) Magadan, Solomon Is., New Caledonia", value: "SRET", iana: "Asia/Magadan" },
  { label: "(UTC+12:00) Auckland, Wellington", value: "NZDT", iana: "Pacific/Auckland" },
  { label: "(UTC+12:00) Fiji, Kamchatka, Marshall Is.", value: "FJT", iana: "Pacific/Fiji" },
  { label: "(UTC+13:00) Nuku'alofa", value: "TOT", iana: "Pacific/Tongatapu" },
]

export function mapLabelToIana(tzLabel: string): string {
  if (!tzLabel) return "UTC"
  if (tzLabel.startsWith("Auto (") && tzLabel.endsWith(")")) {
    return tzLabel.slice(6, -1)
  }
  const found = timezones.find((t) => t.label === tzLabel || t.value === tzLabel || t.iana === tzLabel)
  if (found) return found.iana

  try {
    Intl.DateTimeFormat(undefined, { timeZone: tzLabel })
    return tzLabel
  } catch {
    return "UTC"
  }
}

export function formatTimestamp(
  input: Date | number | string | null | undefined,
  selectedTimezone: string,
  customOptions?: Intl.DateTimeFormatOptions
): string {
  if (!input) return "-"
  const ianaTz = mapLabelToIana(selectedTimezone)

  let date: Date
  if (typeof input === "number") {
    date = input < 1e11 ? new Date(input * 1000) : new Date(input)
  } else if (typeof input === "string") {
    if (!isNaN(Number(input))) {
      const num = Number(input)
      date = num < 1e11 ? new Date(num * 1000) : new Date(num)
    } else {
      date = new Date(input)
    }
  } else {
    date = input
  }

  if (isNaN(date.getTime())) return "-"

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: ianaTz,
    ...customOptions,
  }

  try {
    return date.toLocaleString("en-US", options).replace(/,/g, "")
  } catch {
    return date.toLocaleString("en-US", { ...options, timeZone: "UTC" }).replace(/,/g, "")
  }
}
