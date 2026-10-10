import {generateMaze,searchMaze} from './playground/maze.mjs';
import {createBoard,getCell} from './playground/connect4.mjs';

function fit(canvas){
  const {width:w,height:h}=canvas.getBoundingClientRect();
  if(!w||!h)return null;
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  return {ctx,w,h};
}

export function drawMazePreview(canvas){
  const view=fit(canvas);if(!view)return;
  const {ctx,w,h}=view,maze=generateMaze({size:23,seed:21,algorithm:'dfs',loops:0});
  const result=searchMaze(maze,'bfs');
  ctx.fillStyle='#181a1e';ctx.fillRect(0,0,w,h);
  const px=28,py=22,cw=(w-px*2)/maze.width,ch=(h-py*2)/maze.height;
  ctx.strokeStyle='#c9cbd1';ctx.lineWidth=1.35;ctx.lineCap='square';ctx.beginPath();
  for(let y=0;y<maze.height;y++)for(let x=0;x<maze.width;x++){
    const id=y*maze.width+x,neighbors=maze.adjacency[id];
    const left=px+x*cw,top=py+y*ch;
    if(!y){ctx.moveTo(left,top);ctx.lineTo(left+cw,top);}
    if(!x){ctx.moveTo(left,top);ctx.lineTo(left,top+ch);}
    if(!neighbors.includes(id+1)||x===maze.width-1){ctx.moveTo(left+cw,top);ctx.lineTo(left+cw,top+ch);}
    if(!neighbors.includes(id+maze.width)||y===maze.height-1){ctx.moveTo(left,top+ch);ctx.lineTo(left+cw,top+ch);}
  }
  ctx.stroke();ctx.beginPath();ctx.strokeStyle='#368eff';ctx.lineWidth=2.7;ctx.lineJoin='round';
  result.path.forEach((id,i)=>{const x=px+(id%maze.width+.5)*cw,y=py+(Math.floor(id/maze.width)+.5)*ch;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  for(const id of [maze.start,maze.goal]){ctx.beginPath();ctx.fillStyle='#f7fbff';ctx.arc(px+(id%maze.width+.5)*cw,py+(Math.floor(id/maze.width)+.5)*ch,3.7,0,Math.PI*2);ctx.fill();}
}

export function drawConnectPreview(canvas){
  const view=fit(canvas);if(!view)return;
  const {ctx,w,h}=view,board=createBoard([3,2,3,4,2,4,1,5,5,0,6,1,0,6,2,5]);
  ctx.fillStyle='#0c1322';ctx.fillRect(0,0,w,h);
  const cell=Math.min(43,w/8.4),rowStep=Math.min(37,h/6.6),bw=cell*7+20,bh=rowStep*6+20,x=(w-bw)/2,y=12;
  ctx.shadowColor='#0009';ctx.shadowOffsetY=10;ctx.shadowBlur=22;
  const surface=ctx.createLinearGradient(x,y,x+bw,y+bh);surface.addColorStop(0,'#397bff');surface.addColorStop(.3,'#1353d8');surface.addColorStop(1,'#092d91');
  ctx.fillStyle=surface;ctx.beginPath();ctx.roundRect(x,y,bw,bh,9);ctx.fill();ctx.shadowColor='transparent';
  ctx.strokeStyle='#6b9cff';ctx.lineWidth=1;ctx.stroke();
  for(let row=0;row<6;row++)for(let col=0;col<7;col++){
    const cx=x+10+cell*(col+.5),cy=y+10+rowStep*(5-row+.5),r=Math.min(cell*.385,rowStep*.44),value=getCell(board,row,col);
    const fill=ctx.createRadialGradient(cx-r*.3,cy-r*.4,r*.1,cx,cy,r);
    if(value===null){fill.addColorStop(0,'#0c1935');fill.addColorStop(1,'#061127');}
    else if(value===0){fill.addColorStop(0,'#ff8b75');fill.addColorStop(.65,'#fa5148');fill.addColorStop(1,'#b92b38');}
    else{fill.addColorStop(0,'#ffe67c');fill.addColorStop(.65,'#ffd338');fill.addColorStop(1,'#d99a05');}
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=value===null?'#407def':'#ffffff38';ctx.lineWidth=1;ctx.stroke();
  }
}

export function drawFourierPreview(canvas,data,phase=.84){
  const view=fit(canvas);if(!view)return;
  const {ctx,w,h}=view,scale=Math.min(h*.37,w*.36),ox=w*.56,oy=h*.47;
  ctx.fillStyle='#f5f5f7';ctx.fillRect(0,0,w,h);
  const chain=t=>{const points=[[0,0]];for(let i=0;i<data.frequencies.length;i++){const [re,im]=data.coefficients[i],a=2*Math.PI*data.frequencies[i]*t;const p=points.at(-1);points.push([p[0]+re*Math.cos(a)-im*Math.sin(a),p[1]+re*Math.sin(a)+im*Math.cos(a)]);}return points;};
  const point=([x,y])=>[ox+x*scale,oy-y*scale];
  ctx.beginPath();for(let i=0;i<=300;i++){const [x,y]=point(chain(i/300).at(-1));i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='#ff625730';ctx.lineWidth=1;ctx.stroke();
  const joints=chain(phase);
  joints.slice(0,-1).forEach((p,i)=>{const [x,y]=point(p),r=Math.hypot(...data.coefficients[i])*scale;if(r<.25)return;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle='#8b909b50';ctx.lineWidth=.8;ctx.stroke();});
  ctx.beginPath();joints.forEach((p,i)=>{const [x,y]=point(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle='#65697680';ctx.lineWidth=.8;ctx.stroke();
  ctx.beginPath();for(let i=0;i<=300*phase;i++){const [x,y]=point(chain(i/300).at(-1));i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='#f35a51';ctx.lineWidth=1.8;ctx.stroke();
  const [tx,ty]=point(joints.at(-1));ctx.beginPath();ctx.arc(tx,ty,2.6,0,Math.PI*2);ctx.fillStyle='#ed5149';ctx.fill();
}
