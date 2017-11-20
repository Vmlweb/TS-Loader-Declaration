import { DeclerationsPlugin } from './plugin'

function replaceAt(string, index, replace) {
	return string.substring(0, index) + replace + string.substring(index + replace.length)
}

function loader(text){
	let newText = text
	
	//Loop through local imports and add to end
	const paths = []
	let exp = /import(?:\s|\n)?{[^{}]*}(?:\s|\n)?from(?:\s|\n)?(?:\'|\")((?:\.|\.\.).*)(?:\'|\")/gm
	let match = exp.exec(newText)
	while (match != null) {
		paths.push(match[1])
		match = exp.exec(newText)
	}
	
	//Add paths to end of file
	for (const path of paths){
		newText += '\nimport \'' + path + '\' //<TSLoaderDecleration>'
	}
	
	//Check whether public decorator given
	if (this.query.publicDecorator){
		newText = 'import { Public } from \'' + this.query.publicDecorator + '\'\n' + newText
		
		//Loop through and replace public access
		exp = /[^}]*\s(public)\s[^}]*\s*\([^}]*\)\s*{[^}]*}/gm
		match = exp.exec(newText)
		while (match != null) {
			
			//Replace public
			newText = newText.substr(0, match.index) + newText.substr(match.index).replace(match[1], '@Public ' + match[1])
			
			//Next match
			match = exp.exec(newText)
		}
	}
	
	//Check whether private decorator given
	if (this.query.privateDecorator){
		newText = 'import { Private } from \'' + this.query.privateDecorator + '\'\n' + newText
		
		//Loop through and replace public access
		exp = /[^}]*\s(private)\s[^}]*\s*\([^}]*\)\s*{[^}]*}/gm
		match = exp.exec(newText)
		while (match != null) {
			
			//Replace public
			newText = newText.substr(0, match.index) + newText.substr(match.index).replace(match[1], '@Private ' + match[1])
			
			//Next match
			match = exp.exec(newText)
		}
	}
	
	//Check whether public decorator given
	if (this.query.protectedDecorator){
		newText = 'import { Protected } from \'' + this.query.protectedDecorator + '\'\n' + newText
		
		//Loop through and replace public access
		exp = /[^}]*\s(protected)\s[^}]*\s*\([^}]*\)\s*{[^}]*}/gm
		match = exp.exec(newText)
		while (match != null) {
			
			//Replace public
			newText = newText.substr(0, match.index) + newText.substr(match.index).replace(match[1], '@Protected ' + match[1])
			
			//Next match
			match = exp.exec(newText)
		}
	}
	
	console.log(newText)
	
	return newText
}

namespace loader {
    export const TSDeclerationsPlugin = DeclerationsPlugin
}

export = loader