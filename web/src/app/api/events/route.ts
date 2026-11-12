// TODO(web): event indexer. Fetch the contract's receipts (NearBlocks v3, server-side key), parse
// EVENT_JSON logs into GoodEvent[], cache, and filter by ?account= / ?event= / ?week=.
export async function GET() {
  return Response.json({ status: "not implemented", events: [] }, { status: 501 });
}
