import { TestViewerClient } from '@/components/TestViewerClient';

export default async function TestPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TestViewerClient id={id}/>}
