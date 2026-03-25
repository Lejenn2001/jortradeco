import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH_API = 'https://graph.facebook.com/v21.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
    const igAccountId = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID');

    if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN not configured');
    if (!igAccountId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID not configured');

    const { action, media_url, caption, media_type = 'IMAGE' } = await req.json();

    if (action === 'post') {
      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        access_token: accessToken,
        caption: caption || '',
      };

      if (media_type === 'VIDEO' || media_type === 'REELS') {
        containerParams.media_type = 'REELS';
        containerParams.video_url = media_url;
        containerParams.share_to_feed = 'true';
      } else {
        containerParams.image_url = media_url;
      }

      const containerUrl = `${GRAPH_API}/${igAccountId}/media`;
      console.log('Creating media container...', { media_type, media_url: media_url?.substring(0, 80) });

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerParams),
      });

      const containerData = await containerRes.json();
      if (!containerRes.ok) {
        throw new Error(`Container creation failed [${containerRes.status}]: ${JSON.stringify(containerData)}`);
      }

      const containerId = containerData.id;
      console.log('Container created:', containerId);

      // Step 2: For video, wait for processing
      if (media_type === 'VIDEO' || media_type === 'REELS') {
        let status = 'IN_PROGRESS';
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max

        while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 10000)); // 10s intervals
          attempts++;

          const statusRes = await fetch(
            `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${accessToken}`
          );
          const statusData = await statusRes.json();
          status = statusData.status_code || 'IN_PROGRESS';
          console.log(`Video processing attempt ${attempts}: ${status}`);

          if (status === 'ERROR') {
            throw new Error(`Video processing failed: ${JSON.stringify(statusData)}`);
          }
        }

        if (status === 'IN_PROGRESS') {
          throw new Error('Video processing timed out after 5 minutes');
        }
      }

      // Step 3: Publish
      const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      });

      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        throw new Error(`Publish failed [${publishRes.status}]: ${JSON.stringify(publishData)}`);
      }

      console.log('Published successfully:', publishData.id);

      return new Response(JSON.stringify({
        success: true,
        post_id: publishData.id,
        container_id: containerId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check token validity
    if (action === 'check_token') {
      const res = await fetch(
        `${GRAPH_API}/${igAccountId}?fields=username,name,profile_picture_url&access_token=${accessToken}`
      );
      const data = await res.json();

      return new Response(JSON.stringify({
        success: res.ok,
        account: res.ok ? data : null,
        error: res.ok ? null : data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "post" or "check_token".' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Instagram post error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
