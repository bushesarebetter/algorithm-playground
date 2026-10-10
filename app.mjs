import {drawMazePreview,drawConnectPreview,drawFourierPreview} from './visuals.mjs';
import {createFlock,stepFlock} from './playground/boids.mjs';

const maze=document.querySelector('#maze-preview'),connect=document.querySelector('#connect-preview'),fourier=document.querySelector('#fourier-preview');
let coefficients=null,phase=.84,frame=0,lastDraw=0,hovering=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function redraw(){drawMazePreview(maze);drawConnectPreview(connect);if(coefficients)drawFourierPreview(fourier,coefficients,phase);}
const observer=new ResizeObserver(redraw);for(const c of [maze,connect,fourier])observer.observe(c);
try{const response=await fetch(new URL('./assets/fourier.json',import.meta.url));if(!response.ok)throw new Error('Fourier data unavailable');coefficients=await response.json();redraw();}catch(error){fourier.replaceWith(Object.assign(document.createElement('p'),{className:'empty-message',textContent:'Open the project to see the Fourier reconstruction.'}));}
function animate(time){if(!hovering||reduced.matches||document.hidden){frame=0;return;}if(time-lastDraw>35){phase=(phase+.0035)%1;drawFourierPreview(fourier,coefficients,phase);lastDraw=time;}frame=requestAnimationFrame(animate);}
function start(){hovering=true;if(coefficients&&!frame&&!reduced.matches)frame=requestAnimationFrame(animate);}
function stop(){hovering=false;cancelAnimationFrame(frame);frame=0;}
const fourierLink=document.querySelector('.fourier-preview');fourierLink.addEventListener('pointerenter',start);fourierLink.addEventListener('focus',start);fourierLink.addEventListener('pointerleave',stop);fourierLink.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',()=>{stop();redraw();});
const filters=[...document.querySelectorAll('[data-filter]')];
const projects=[
['fourier-epicycles','Fourier Epicycles','algorithms','A drawing reconstructed from spinning circles.'],
['mandelbrot-explorer','Mandelbrot Explorer','simulations','Smooth-colored fractals and a closer look at their boundaries.'],
['game-of-life','Game of Life','simulations','Conway’s cellular automaton and variant rules.'],
['sudoku-solver','Sudoku Solver','algorithms','Constraint propagation followed by a careful search.'],
['maze-solver','Maze Solver','algorithms','Two generators. Three shortest-path algorithms.'],
['lsystem-fractals','L-system Fractals','simulations','Koch, Hilbert, dragon curves, and growing plants.'],
['huffman-compression','Huffman Compression','algorithms','Prefix codes, binary files, and Shannon entropy.'],
['boids','Boids','simulations','Flocking from separation, alignment, and cohesion.'],
['double-pendulum-chaos','Double Pendulum Chaos','simulations','RK4 integration and sensitive initial conditions.'],
['rsa-from-scratch','RSA from Scratch','algorithms','Primes, signatures, and Wiener’s weak-key attack.'],
['raytracer','Ray Tracer','algorithms','Vectorized rays, shadows, reflections, and antialiasing.'],
['sat-solver','SAT Solver','algorithms','DPLL and conflict-driven clause learning.'],
['tiny-lisp','Tiny Lisp','algorithms','A Scheme interpreter with closures and proper tail calls.'],
['regex-engine','Regex Engine','algorithms','Thompson construction and nondeterministic automata.'],
['scalar-autograd','Scalar Autograd','ml','Automatic differentiation, one scalar at a time.'],
['numpy-neural-net','NumPy Neural Net','ml','A neural network with hand-built backpropagation.'],
['stable-fluids','Stable Fluids','simulations','Advection, pressure projection, and moving dye.'],
['barnes-hut-nbody','Barnes–Hut N-body','simulations','A quadtree approximation to gravitational forces.'],
['connect-four-ai','Connect Four AI','algorithms','Alpha-beta search meets Monte Carlo tree search.'],
['tiny-gpt','Tiny GPT','ml','A character-level transformer trained on Shakespeare.'],
['grokking-progress-measures','Grokking Progress Measures','ml','Fourier analysis of a modular-arithmetic model.'],
['grokfast','Grokfast','ml','Filtering the slow-changing part of a gradient.'],
['forward-forward','Forward-Forward','ml','Layer-local learning without backprop between layers.'],
['differentiable-plasticity','Differentiable Plasticity','ml','Learned Hebbian connections and pattern completion.'],
['toy-superposition','Toy Superposition','ml','Sparse features competing for fewer dimensions.'],
['coconut-latent-reasoning','Coconut','ml','Continuous hidden-state feedback on synthetic arithmetic.']
];
const collection=document.querySelector('#project-collection');
for(const [slug,name,category,description]of projects){const entry=document.createElement('article');entry.className='collection-entry';entry.dataset.category=category;const link=document.createElement('a');link.href=`https://github.com/bushesarebetter/${slug}`;link.textContent=name;const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('class','arrow');arrow.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#arrow');arrow.append(use);link.append(arrow);const p=document.createElement('p');p.textContent=description;entry.append(link,p);collection.append(entry);}
for(const button of filters)button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  let shown=0;document.querySelectorAll('.project[data-category]').forEach(card=>{card.hidden=filter!=='selected'&&card.dataset.category!==filter;if(!card.hidden)shown++;});
  document.querySelectorAll('.collection-entry').forEach(entry=>{entry.hidden=filter!=='selected'&&entry.dataset.category!==filter;});
  document.querySelector('#gallery-empty').hidden=shown>0;
  document.querySelector('#filter-status').textContent=`${button.textContent}: ${shown} featured projects. The full collection follows below.`;
  redraw();
});

const flockCanvas=document.querySelector('#flock-preview'),flockToggle=document.querySelector('#flock-toggle');
let flock=createFlock({count:150,size:60,seed:27}),running=!reduced.matches,visible=false,flockFrame=0,previous=0,accumulator=0;
function drawFlock(){const rect=flockCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!rect.width)return;flockCanvas.width=Math.round(rect.width*dpr);flockCanvas.height=Math.round(rect.height*dpr);const ctx=flockCanvas.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#0b1525';ctx.fillRect(0,0,rect.width,rect.height);flock.positions.forEach(([x,y],i)=>{const [vx,vy]=flock.velocities[i],angle=Math.atan2(vy,vx);ctx.save();ctx.translate(x/60*rect.width,y/60*(rect.height-48)+5);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-2.5);ctx.lineTo(-1,0);ctx.lineTo(-3,2.5);ctx.closePath();ctx.fillStyle=i%9===0?'#ffb096':'#8ccaff';ctx.fill();ctx.restore();});}
function flockLoop(time){if(!running||!visible||document.hidden){flockFrame=0;previous=0;return;}accumulator+=Math.min((time-(previous||time))/1000,.12);previous=time;while(accumulator>=.04){flock=stepFlock(flock);accumulator-=.04;}drawFlock();flockFrame=requestAnimationFrame(flockLoop);}
function syncFlock(){flockToggle.textContent=running?'Pause animation':'Run animation';if(running&&visible&&!document.hidden&&!flockFrame)flockFrame=requestAnimationFrame(flockLoop);else if(!running||!visible||document.hidden){cancelAnimationFrame(flockFrame);flockFrame=0;previous=0;}drawFlock();}
flockToggle.addEventListener('click',()=>{running=!running;syncFlock();});new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncFlock();}).observe(flockCanvas);new ResizeObserver(drawFlock).observe(flockCanvas);document.addEventListener('visibilitychange',syncFlock);reduced.addEventListener('change',()=>{if(reduced.matches)running=false;syncFlock();});syncFlock();
