export type Stat = {
  number: string
  text: string
}

export interface CardData {
  title: string
  link: string
  background: string
  stats: Stat[]
}
