import type {InputHTMLAttributes} from 'react';
/** Keep an empty numeric draft empty; validation happens on submit. */
export default function NumberInput({value,...props}:InputHTMLAttributes<HTMLInputElement>){
 return <input {...props} type="number" value={typeof value==='number'&&!Number.isFinite(value)?'':value}/>;
}
