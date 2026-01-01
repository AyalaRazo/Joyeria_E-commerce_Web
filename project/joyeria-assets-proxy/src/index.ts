export default {
	async fetch(request: Request): Promise<Response> {
	  const url = new URL(request.url);
  
	  // Proxy para imágenes
	  if (url.pathname.startsWith("/images/")) {
		const path = url.pathname.replace("/images/", "");
		const target = `https://xrtfrtiubugctntwbami.supabase.co/storage/v1/object/public/products/${path}`;
  
		return fetch(target, {
		  method: "GET",
		  headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
		  },
		});
	  }
  
	  // Proxy para videos
	  if (url.pathname.startsWith("/videos/")) {
		const path = url.pathname.replace("/videos/", "");
		const target = `https://xrtfrtiubugctntwbami.supabase.co/storage/v1/object/public/products/videos/${path}`;
  
		return fetch(target, {
		  method: "GET",
		  headers: {
			"Cache-Control": "public, max-age=86400",
		  },
		});
	  }
  
	  return new Response("Not Found", { status: 404 });
	},
  };
  