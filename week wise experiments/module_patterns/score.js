let score = 0; // private to this file

export function add(n)  
{ score += n; }

export function reset()
 { score = 0; }

export function get() 
  { return score; }
