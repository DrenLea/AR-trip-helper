export function ReplacementSheet({onReplace}:{onReplace:(id:string)=>void}):JSX.Element{return <section aria-label="替换节点"><button type="button" onClick={()=>onReplace('')}>选择替换节点</button></section>;}
