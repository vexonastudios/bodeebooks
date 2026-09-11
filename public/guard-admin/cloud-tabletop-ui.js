const GAMES=[['chess','Chess','crown','♞'],['connect-four','Connect Four','circle','●'],['checkers','Checkers','circle-dot','◉'],['fleet-battle','Fleet Battle','ship','⛴']];
const PIECES={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
export function setupTabletop({root,request,parent=false}){
  let state={supported:false,rooms:[]},selected='chess',square=null,draftId=null,draft=[],shipId='flagship',localBusy=false,renderKey='';
  const node=(tag,text='',css='')=>{const n=document.createElement(tag);n.className=css;n.textContent=text;return n;};
  const icon=name=>{const i=node('i');i.dataset.lucide=name;i.setAttribute('aria-hidden','true');return i;};
  const button=(text,fn,symbol,disabled=false)=>{const b=node('button','','btn btn-secondary');b.type='button';b.disabled=disabled;if(symbol)b.append(icon(symbol));b.append(document.createTextNode(text));b.addEventListener('click',fn);return b;};
  const note=node('p','','tabletop-note');note.setAttribute('role','status');
  const counter=node('span','','cloud-game-badge'),body=node('div'),catalog=node('div','','tabletop-catalog');
  const header=node('div','','cloud-game-section-heading'),heading=node('h3','Play with your siblings');header.append(heading,counter);
  root.classList.add('tabletop-room');root.append(header,node('p','Choose a game. One child hosts, and another joins on the same home Wi-Fi.','cloud-note'),catalog,note,body);
  async function run(kind,input){if(localBusy)return;localBusy=true;draw(true);try{setState(await request(kind,input));}catch(e){note.textContent=e.message;}finally{localBusy=false;draw(true);}}
  function action(input){square=null;return run('move',{id:crypto.randomUUID(),revision:state.match.revision,...input});}
  function setState(value){state=value||{supported:false,rooms:[]};if(state.game)selected=state.game;counter.textContent=state.remainingSeconds==null?'Home LAN':`${Math.floor(state.remainingSeconds/60)}:${String(state.remainingSeconds%60).padStart(2,'0')} left`;note.textContent=state.message||'';draw();}
  function draw(force=false){
    const key=JSON.stringify([state.game,state.roomId,state.connected,state.match?.id,state.match?.revision,state.pendingMove,state.rooms,state.busy,state.supported,state.history,localBusy]);
    if(!force&&key===renderKey)return;renderKey=key;root.classList.toggle('has-match',!!state.match);catalog.replaceChildren();body.replaceChildren();
    const busy=localBusy||state.busy||state.pendingMove;
    for(const [id,name,symbol,mark]of GAMES){const b=button('',()=>{selected=id;square=null;draw(true);},null,!!state.game&&id!==state.game||busy);b.className='tabletop-game'+(selected===id?' selected':'');b.setAttribute('aria-pressed',String(selected===id));const art=node('span',mark,`tabletop-game-icon ${id}`);art.setAttribute('aria-hidden','true');const title=node('span');title.append(node('strong',name),node('small','Play over your home LAN'));b.append(art,title);catalog.append(b);}
    if(parent||!state.supported){body.append(node('p',parent?'Included in the Windows child app. Children host and join here; your computer does not need to stay on. Family Games access and time limits above apply to all four games.':'Open the updated BodeeGuard Windows app to host or join these games.','cloud-note'));icons();return;}
    if(!state.game){
      const actions=node('div','','cloud-game-actions');actions.append(button(`Host ${GAMES.find(g=>g[0]===selected)[1]}`,()=>run('host',{game:selected}),'radio',busy));body.append(actions);
      const rooms=node('div','','tabletop-lobby');rooms.append(node('h4','Join a sibling'));
      const available=(state.rooms||[]).filter(r=>r.game===selected);
      if(!available.length)rooms.append(node('p','No room open yet. Ask a sibling to open Family Games, choose this game and press Host.','cloud-note'));
      for(const room of available)rooms.append(button(`Join ${GAMES.find(g=>g[0]===room.game)[1]} · ${room.id.slice(0,4).toUpperCase()}`,()=>run('join',{roomId:room.id}),'users-round',busy));
      const help=node('details');help.append(node('summary','Having trouble finding each other?'),node('p','Both computers need the same private home network. Guest Wi-Fi may keep computers separate. Keep BodeeGuard open on both and allow it on private networks.','cloud-note'));rooms.append(help);body.append(rooms);history();icons();return;
    }
    const controls=node('div','','cloud-game-actions');
    controls.append(button(state.match?'Leave match':'Close room',()=>run('leave'),'log-out',busy));
    if(!state.hosting&&!state.connected)controls.append(button('Reconnect',()=>run('reconnect'),'refresh-cw',busy));
    if(state.connected&&state.match&&!state.match.outcome)controls.append(button('Resign',()=>{if(window.confirm('Resign this match? Your sibling will win.'))action({type:'resign'});},'flag',busy));
    body.append(controls);
    if(!state.match){body.append(node('div',`Room ${state.roomId?.slice(0,4).toUpperCase()} · Waiting for your sibling…`,'tabletop-waiting'));icons();return;}
    const match=state.match;
    const meIndex=match.seat===({'chess':'white','connect-four':'red',checkers:'red','fleet-battle':'navy'}[match.game])?0:1;
    const other=match.players[1-meIndex]?.name||'Your sibling';
    const result=match.outcome?(match.outcome.result==='draw'?'Draw':match.outcome.result===match.seat?'You won!':`${other} won`):!state.connected?'Match paused':match.game==='fleet-battle'&&match.phase==='placement'?'Arrange your fleet':match.turn===match.seat?'Your turn':`${other}’s turn`;
    body.append(node('h3',`${match.players[meIndex]?.name||'You'} vs ${other}`),node('p',`${result} · You are ${match.seat}${match.check?' · Check':''}`,'tabletop-turn'));
    const canMove=state.connected&&!busy&&!match.outcome&&match.turn===match.seat;
    if(match.game==='fleet-battle')fleet(match,canMove,busy);else if(match.game==='connect-four')connectFour(match,canMove);else board(match,canMove);
    if(match.outcome)body.append(button('Back to game room',()=>run('leave'),'arrow-left',busy));
    const moves=node('details','','tabletop-moves');moves.append(node('summary',`${match.moves?.length||0} moves · View history`),node('p',(match.moves||[]).map(m=>typeof m==='string'?m:m.notation).join(' · ')));body.append(moves);icons();
  }
  function icons(){window.lucide?.createIcons({root});}
  function history(){const list=state.history||[];if(!list.length)return;const details=node('details','','tabletop-history');details.append(node('summary','Your recent results on this computer'));const rows=node('ul');for(const row of list.slice(0,12))rows.append(node('li',`${GAMES.find(g=>g[0]===row.game)?.[1]||row.game} · ${row.result} · ${row.opponent}`));details.append(rows);body.append(details);}
  function board(match,canMove){
    const grid=node('div','','tabletop-board');grid.setAttribute('aria-label',`${GAMES.find(g=>g[0]===match.game)[1]} board`);
    const flipped=match.seat==='black',order=Array.from({length:8},(_,i)=>flipped?7-i:i),chess=match.game==='chess';
    const key=(r,c)=>chess?`${'abcdefgh'[c]}${8-r}`:`${r}:${c}`;
    const from=move=>chess?move.from:`${move.from.row}:${move.from.column}`,to=move=>chess?move.to:`${move.to.row}:${move.to.column}`;
    for(const r of order)for(const c of order){
      const piece=match.board[r][c],id=key(r,c),legal=(match.legalMoves||[]).filter(m=>from(m)===square&&to(m)===id);
      const b=button('',()=>{
        if(legal.length){if(chess&&legal.some(m=>m.promotion)){promotion(legal);return;}action(chess?{from:square,to:id}:{from:{row:Number(square.split(':')[0]),column:Number(square.split(':')[1])},to:{row:r,column:c}});}
        else{square=piece?.seat===match.seat?id:null;draw(true);}
      },null,!canMove||!chess&&(r+c)%2===0);
      b.className=`tabletop-square ${(r+c)%2?'dark':'light'}${square===id?' selected':''}${legal.length?' destination':''}`;
      b.setAttribute('aria-label',`${'abcdefgh'[c]}${8-r}${piece?` ${piece.seat} ${piece.piece|| (piece.king?'king':'piece')}`:' empty'}`);
      if(piece)b.append(node('span',chess?PIECES[piece.piece]:(piece.king?'♛':''),chess?`tabletop-piece ${piece.seat}`:`cloud-checkers-piece ${piece.seat}`));grid.append(b);
    }
    body.append(grid);if(match.mustContinue)body.append(node('p','Continue the jump with the same piece.','cloud-note'));
  }
  function promotion(moves){const dialog=node('dialog','','cloud-game-dialog');dialog.append(node('h3','Choose your new piece'));for(const [p,label]of [['q','Queen'],['r','Rook'],['b','Bishop'],['n','Knight']])if(moves.some(m=>m.promotion===p))dialog.append(button(label,()=>{dialog.close();action({from:moves[0].from,to:moves[0].to,promotion:p});}));dialog.addEventListener('close',()=>dialog.remove());root.append(dialog);dialog.showModal();}
  function connectFour(match,canMove){const grid=node('div','','tabletop-connect-four');grid.setAttribute('aria-label','Connect Four board');for(let c=0;c<7;c++)grid.append(button(`Drop ${c+1}`,()=>action({column:c}),'arrow-down',!canMove||!match.legalColumns.includes(c)));for(let r=0;r<6;r++)for(let c=0;c<7;c++){const cell=node('span','',`tabletop-disc ${match.board[r][c]||''}${match.winningCells?.some(v=>v[0]===r&&v[1]===c)?' winner':''}`);cell.setAttribute('aria-label',`Row ${r+1}, column ${c+1}: ${match.board[r][c]||'empty'}`);grid.append(cell);}body.append(grid);}
  function cells(ship,spec){return Array.from({length:spec.length},(_,i)=>({row:ship.row+(ship.orientation==='vertical'?i:0),column:ship.column+(ship.orientation==='horizontal'?i:0)}));}
  function valid(ships,specs){const used=new Set();for(const spec of specs){const ship=ships.find(s=>s.id===spec.id);if(!ship)return false;for(const p of cells(ship,spec)){const key=`${p.row}:${p.column}`;if(p.row<0||p.row>9||p.column<0||p.column>9||used.has(key))return false;used.add(key);}}return true;}
  function shuffle(specs){const next=[];for(const spec of specs){let placed=false;for(let i=0;i<300&&!placed;i++){const ship={id:spec.id,row:Math.floor(Math.random()*10),column:Math.floor(Math.random()*10),orientation:Math.random()<.5?'horizontal':'vertical'};if(valid([...next,ship],specs.slice(0,next.length+1))){next.push(ship);placed=true;}}if(!placed)return specs.map((s,i)=>({id:s.id,row:i,column:0,orientation:'horizontal'}));}return next;}
  function fleet(match,canMove,busy){
    const ready=match.ready.mine;
    if(draftId!==match.id){draftId=match.id;draft=shuffle(match.specs);shipId='flagship';}
    if(match.phase==='placement'&&!ready){
      const layout=node('div','','tabletop-fleet-layout'),yard=node('div','','tabletop-shipyard');
      for(const spec of match.specs){const b=button(`${spec.name} · ${spec.length} squares`,()=>{shipId=spec.id;draw(true);},'ship',busy);b.setAttribute('aria-pressed',String(shipId===spec.id));yard.append(b);}
      const change=(row,column,rotate=false)=>{const next=draft.map(s=>s.id!==shipId?s:{...s,row:row??s.row,column:column??s.column,orientation:rotate?(s.orientation==='horizontal'?'vertical':'horizontal'):s.orientation});if(valid(next,match.specs)){draft=next;draw(true);}else note.textContent='Ships must fit in the ocean without overlapping.';};
      yard.append(button('Rotate selected',()=>change(null,null,true),'rotate-cw',busy),button('Shuffle fleet',()=>{draft=shuffle(match.specs);draw(true);},'shuffle',busy),button('Ready to play',()=>action({type:'place_fleet',ships:draft}),'check',busy||!state.connected));
      const occupied=draft.flatMap(s=>cells(s,match.specs.find(p=>p.id===s.id)).map(c=>({...c,id:s.id})));layout.append(ocean('Place your ships',(r,c)=>change(r,c),(r,c)=>{const ship=occupied.find(p=>p.row===r&&p.column===c);return ship?(ship.id===shipId?'ship selected':'ship'):'';},!state.connected||busy),yard);body.append(node('p','Select a ship, then tap its starting square. Your sibling cannot see your ships.','cloud-note'),layout);
    }else if(match.phase==='placement')body.append(node('p','Your fleet is ready and hidden. Waiting for your sibling…','tabletop-waiting'));
    else{
      const shots=(r,c,list)=>list.find(s=>s.row===r&&s.column===c);
      const layout=node('div','','tabletop-fleet-layout');
      layout.append(ocean('Target ocean',(r,c)=>{if(!shots(r,c,match.target_shots))action({type:'fire',row:r,column:c});},(r,c)=>shots(r,c,match.target_shots)?.result||'',!canMove),ocean('Your fleet',()=>{},(r,c)=>`${match.own_fleet.some(s=>s.cells.some(p=>p.row===r&&p.column===c))?'ship ':''}${shots(r,c,match.incoming_shots)?.result||''}`,true));body.append(layout,node('p',`${match.own_remaining} of your ships remain · ${match.opponent_remaining} opposing ships remain. Red = hit; white = miss.`,'cloud-note'));
    }
  }
  function ocean(title,click,css,disabled){const panel=node('section');panel.append(node('h4',title));const grid=node('div','','tabletop-ocean');grid.setAttribute('aria-label',title);for(let r=0;r<10;r++)for(let c=0;c<10;c++){const style=css(r,c);const b=button(style.includes('hit')?'×':style.includes('miss')?'·':'',()=>click(r,c),null,disabled);b.className='tabletop-water '+style;b.setAttribute('aria-label',`${title} ${'ABCDEFGHIJ'[c]}${r+1} ${style}`);grid.append(b);}panel.append(grid);return panel;}
  setState(state);return {setState};
}
