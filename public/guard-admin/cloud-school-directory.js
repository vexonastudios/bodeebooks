// Common starting addresses, not endorsements or proof of an active account.
// Parents review the actual student sign-in address before adding access.
export const commonSchoolSites = [
  {title:'Abeka Academy',url:'https://academy.abeka.com/',provider:'abeka',terms:'abeka academy'},
  {title:'BJU Press Homeschool',url:'https://homeschoolhub.com/auth',provider:'bju',terms:'bob jones bju press homeschool hub'},
  {title:'IXL',url:'https://www.ixl.com/',terms:'ixl math language arts grammar science'},
  {title:'Khan Academy',url:'https://www.khanacademy.org/',terms:'khan academy math science'},
  {title:'Time4Learning',url:'https://www.time4learning.com/',terms:'time4learning time 4 learning homeschool'},
  {title:'Easy Peasy All-in-One Homeschool',url:'https://allinonehomeschool.com/',terms:'easy peasy all in one homeschool'},
  {title:'Quill',url:'https://www.quill.org/',terms:'quill grammar writing'},
  {title:'NoRedInk',url:'https://www.noredink.com/',terms:'no red ink noredink grammar writing'}
];
export function commonSchoolMatches(query=''){
  const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commonSchoolSites.filter(site=>words.every(word=>(site.terms+' '+site.url).toLowerCase().includes(word)));
}
export function schoolWebsite(value){
  const text=String(value||'').trim();
  if(!text||text.length>2048)throw Error('Enter the school website, or choose Cancel to add it later.');
  let url;try{url=new URL(/^[a-z][a-z\d+.-]*:/i.test(text)?text:'https://'+text);}catch{throw Error('Enter a valid school website address.');}
  if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.'))throw Error('Use an HTTPS school website without a password in the address.');
  return url.href;
}
export function schoolProvider(url){
  const host=new URL(url).hostname;
  return /(^|\.)abeka\.com$/.test(host)?'abeka':/(^|\.)homeschoolhub\.com$/.test(host)?'bju':'custom';
}
