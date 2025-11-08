import axios from 'axios'
import { DateTime } from 'luxon'

function graphClientCredentials() {
  const tenant = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  if (!tenant || !clientId || !clientSecret) throw new Error('Missing Azure credentials')
  return async function getToken() {
    const params = new URLSearchParams()
    params.append('client_id', clientId)
    params.append('scope', 'https://graph.microsoft.com/.default')
    params.append('client_secret', clientSecret)
    params.append('grant_type', 'client_credentials')
    const { data } = await axios.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, params)
    return data.access_token
  }
}

export async function fetchMailboxMessages({ mailbox, startISO, endISO, max=200 }) {
  const getToken = graphClientCredentials()
  const token = await getToken()
  const base = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages`
  const params = {
    $filter: `receivedDateTime ge ${startISO} and receivedDateTime le ${endISO}`,
    $select: 'subject,receivedDateTime,from,bodyPreview,internetMessageId',
    $orderby: 'receivedDateTime asc',
    $top: 50,
  }
  const items = []
  let nextUrl = null
  do {
    const { data } = await axios.get(nextUrl || base, {
      headers: { Authorization: `Bearer ${token}` },
      params: nextUrl ? undefined : params,
    })
    for (const m of data.value) {
      items.push({
        subject: m.subject,
        receivedDateTime: m.receivedDateTime,
        from: m.from?.emailAddress ? `${m.from.emailAddress.name} <${m.from.emailAddress.address}>` : '',
        bodyPreview: m.bodyPreview,
        internetMessageId: m.internetMessageId,
      })
    }
    nextUrl = data['@odata.nextLink']
  } while (nextUrl && items.length < max)
  return items.slice(0, max)
}

export function getDhakaDayRangeISO(dateYMD) {
  const tz = process.env.TIMEZONE || 'Asia/Dhaka'
  const day = DateTime.fromISO(dateYMD, { zone: tz })
  const start = day.startOf('day').toUTC()
  const end = day.endOf('day').toUTC()
  return { startISO: start.toISO(), endISO: end.toISO() }
}
