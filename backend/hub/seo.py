"""robots.txt and sitemap.xml, both generated from the registry.

Two things stand between a registry object and someone finding it: a crawler
has to be allowed in, and it has to be told the page exists. The site is a
single page application, so no link on it survives without JavaScript, which
makes the sitemap the only reliable way a search engine learns that
`/r/piighost/fr-default` is a page at all.

Both are generated rather than written by hand, for the same reason the site
is: the registry grows, and a list of 218 URLs maintained by a human is a list
of 180 URLs three weeks later. They sit at the site root rather than under
`/api`, because that is where a crawler looks, and nginx proxies the two exact
paths through.
"""

from __future__ import annotations

from datetime import UTC, datetime
from xml.sax.saxutils import escape

from litestar import Request, Response, get
from litestar.datastructures import State

from backend.hub.registry import Registry
from backend.hub.routes import STATE_KEY

XML_MEDIA_TYPE = "application/xml"
TEXT_MEDIA_TYPE = "text/plain"

# The pages a crawler should know about that are not a registry object.
STATIC_PATHS = (
    "/",
    "/labels",
    "/stats",
    "/playground",
    "/playground/compare",
    "/playground/chat",
    "/contribute",
)

# An hour: the registry changes when a pull request lands, not by the minute.
CACHE = "public, max-age=3600"


def _origin(request: Request) -> str:
    """The public origin, honouring the proxy headers nginx sets.

    Taken from the request rather than from configuration so a preview
    deployment, a local run and production each advertise themselves and not
    each other.
    """
    url = request.url
    scheme = request.headers.get("x-forwarded-proto", url.scheme)
    host = request.headers.get("host", url.netloc)
    return f"{scheme}://{host}"


@get(
    "/robots.txt",
    name="hub:robots",
    media_type=TEXT_MEDIA_TYPE,
    include_in_schema=False,
)
async def robots(request: Request) -> Response[str]:
    """Allow everything, and say where the sitemap is.

    The API is disallowed, not because it is secret, it is deliberately public,
    but because a crawler spending its budget on `/api/v1/refs/.../resolved`
    finds JSON where the same content already has an HTML page.
    """
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Disallow: /schema\n"
        f"\nSitemap: {_origin(request)}/sitemap.xml\n"
    )
    return Response(body, media_type=TEXT_MEDIA_TYPE, headers={"Cache-Control": CACHE})


@get(
    "/sitemap.xml",
    name="hub:sitemap",
    media_type=XML_MEDIA_TYPE,
    include_in_schema=False,
)
async def sitemap(request: Request, state: State) -> Response[str]:
    """Every static page, then one entry per registry object.

    A commit page is left out on purpose. It is immutable and there are several
    per object, so listing them would multiply the sitemap by the history depth
    to no benefit: the head page links to each of them.
    """
    registry: Registry = getattr(state, STATE_KEY)
    origin = _origin(request)
    today = datetime.now(UTC).date().isoformat()

    entries = [f"<url><loc>{origin}{path}</loc></url>" for path in STATIC_PATHS]
    for key, head in sorted(registry.heads.items()):
        recorded = head.recorded_at[:10] if head.recorded_at else today
        entries.append(
            f"<url><loc>{origin}/r/{escape(key)}</loc>"
            f"<lastmod>{recorded}</lastmod></url>"
        )

    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(body, media_type=XML_MEDIA_TYPE, headers={"Cache-Control": CACHE})
