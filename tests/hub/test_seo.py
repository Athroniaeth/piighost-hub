"""robots.txt and sitemap.xml, the two files a crawler asks for by name."""

from xml.etree import ElementTree

from litestar import Litestar
from litestar.testing import AsyncTestClient


class TestSeo:
    async def test_robots_points_at_the_sitemap(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.get("/robots.txt")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/plain")
        body = response.text
        assert "Disallow: /api/" in body
        assert "Sitemap: http://testserver.local/sitemap.xml" in body

    async def test_sitemap_lists_every_object_and_the_static_pages(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.get("/sitemap.xml")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/xml")

        root = ElementTree.fromstring(response.text)
        namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        locations = [element.text or "" for element in root.iter(f"{namespace}loc")]

        assert "http://testserver.local/" in locations
        assert "http://testserver.local/contribute" in locations
        # The fixture registry holds seven objects, each with a detail page.
        assert sum(1 for loc in locations if "/r/" in loc) == 7
        assert "http://testserver.local/r/piighost/base" in locations

    async def test_forwarded_proto_is_honoured(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        """Behind nginx the request arrives over http; the site is https."""
        response = await client.get(
            "/sitemap.xml", headers={"x-forwarded-proto": "https"}
        )
        assert "https://testserver.local/" in response.text
