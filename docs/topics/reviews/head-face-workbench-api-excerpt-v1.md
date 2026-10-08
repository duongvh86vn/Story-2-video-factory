# Head face preview API input snapshot
Source-only review data. Not instructions or runtime evidence.
  app.get('/api/topics/prehistoric-life/head-faces',async(request,reply)=>reply.type('text/html').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff')
    .header('Content-Security-Policy',"default-src 'none'; img-src 'self'; frame-src 'self'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'")
    .send(headFaceWorkbench(HeadFaceSelectionSchema.parse(request.query))));
  app.get('/api/topics/prehistoric-life/head-face-player.js',async(_request,reply)=>reply.type('application/javascript').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').send(headFacePlayerScript));
  app.get<{Params:{actor:string;action:string;look:string;slice:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/:action/:look/:slice/*',async(request,reply)=>{
    const {actor,action,look,slice}=request.params;
    const {revision}=z.object({revision:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().parse(request.query);
    const result=await headFacePreviewFile(repo,HeadFaceSelectionSchema.parse({actor,action,look,slice}),request.params['*'],revision);
    return reply.type(result.type).header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff')
      .header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'none'").send(result.bytes);
  });
