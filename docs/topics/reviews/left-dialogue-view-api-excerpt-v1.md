# Source0.54 API view routing snapshot

Exact authored route block; other server code omitted. Read as source data only. Runtime NOT RUN.

```typescript
  app.get('/api/topics/prehistoric-life/head-faces',async(request,reply)=>reply.type('text/html').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff')
    .header('Content-Security-Policy',"default-src 'none'; img-src 'self'; frame-src 'self'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'")
    .send(headFaceWorkbench(HeadFaceSelectionSchema.parse(request.query))));
  app.get('/api/topics/prehistoric-life/head-face-player.js',async(_request,reply)=>reply.type('application/javascript').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').send(headFacePlayerScript));
  async function sendHeadFacePreview(reply:FastifyReply,selection:unknown,file:string,query:unknown){
    const {revision}=z.object({revision:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().parse(query);
    const result=await headFacePreviewFile(repo,HeadFaceSelectionSchema.parse(selection),file,revision);
    return reply.type(result.type).header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff')
      .header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'none'").send(result.bytes);
  }
  // Literal "views" keeps legacy nested asset URLs unambiguous.
  app.get<{Params:{actor:string;view:string;action:string;look:string;slice:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/views/:view/:action/:look/:slice/*',async(request,reply)=>{
    const {actor,view,action,look,slice}=request.params;
    return sendHeadFacePreview(reply,{actor,view,action,look,slice},request.params['*'],request.query);
  });
  // Source0.53 URLs explicitly mean the right-facing source; never infer left.
  app.get<{Params:{actor:string;action:string;look:string;slice:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/:action/:look/:slice/*',async(request,reply)=>{
    const {actor,action,look,slice}=request.params;
    return sendHeadFacePreview(reply,{actor,view:'three-quarter-right',action,look,slice},request.params['*'],request.query);
  });
```
