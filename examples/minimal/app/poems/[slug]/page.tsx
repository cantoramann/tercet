import { tercet } from "@/tercet";

export const revalidate = 600;
export const dynamicParams = true;

export const { generateStaticParams, generateMetadata } = tercet.poem;
export default tercet.poem.Page;
