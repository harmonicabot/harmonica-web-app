import { Metadata } from 'next'
import { getGeneratedMetadata } from '../../api/metadata'

type Props = {
  searchParams: { pathAndSearch: string }
}


export function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return getGeneratedMetadata(searchParams.pathAndSearch)
}

export default function BotChatMetadataPreview({ searchParams }: Props) {
  // Yeah, I'm on purpose returning an empty block here. 
  // The generate(d)Metadata from above will be added by next.js, 
  // and that's all we need.
  return (
    <></>
  )
}