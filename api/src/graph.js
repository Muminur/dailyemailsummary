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
  try {
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
    let requestCount = 0
    const maxRequests = 10 // Prevent infinite loops
    
    do {
      if (requestCount >= maxRequests) {
        console.warn(`Reached maximum requests (${maxRequests}) for Graph API`)
        break
      }
      
      const { data } = await axios.get(nextUrl || base, {
        headers: { Authorization: `Bearer ${token}` },
        params: nextUrl ? undefined : params,
        timeout: 30000, // 30 second timeout
      })
      
      if (!data.value || !Array.isArray(data.value)) {
        console.warn('Invalid response from Graph API:', data)
        break
      }
      
      for (const m of data.value) {
        if (!m) continue
        items.push({
          subject: m.subject || 'No Subject',
          receivedDateTime: m.receivedDateTime || new Date().toISOString(),
          from: m.from?.emailAddress ? `${m.from.emailAddress.name || 'Unknown'} <${m.from.emailAddress.address}>` : 'Unknown Sender',
          bodyPreview: m.bodyPreview || '',
          internetMessageId: m.internetMessageId || `msg-${Date.now()}-${items.length}`,
        })
      }
      
      nextUrl = data['@odata.nextLink']
      requestCount++
    } while (nextUrl && items.length < max)
    
    return items.slice(0, max)
  } catch (error) {
    console.error('Error fetching mailbox messages:', error)
    if (error.response) {
      console.error('Graph API Error Response:', error.response.data)
    }
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }
}

export function getDhakaDayRangeISO(dateYMD) {
  const tz = process.env.TIMEZONE || 'Asia/Dhaka'
  const day = DateTime.fromISO(dateYMD, { zone: tz })
  const start = day.startOf('day').toUTC()
  const end = day.endOf('day').toUTC()
  return { startISO: start.toISO(), endISO: end.toISO() }
}
