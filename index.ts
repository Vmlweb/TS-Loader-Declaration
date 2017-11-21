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
		
		//Check whether public already being used
		if (newText.indexOf('Public') < 0){
			newText = 'import { Public } from \'' + this.query.publicDecorator + '\'\n' + newText
		}
		
		//Add decorator to public
		newText = newText.replace(/\spublic\s(?!constructor)/gm, ' @Public public ')
		newText = newText.replace(/constructor\(public\s/gm, 'constructor(@Public public ')
		newText = newText.replace(/,public\s/gm, ',@Public public ')
		
		//Loop through and replace public access
		/*
		exp = /[^}]*\s(public)\s[^}]*\s*\([^}]*\)\s*{[^}]*}/gm
		match = exp.exec(newText)
		while (match != null) {
			
			//Replace public
			newText = newText.substr(0, match.index) + newText.substr(match.index).replace(match[1], '@Public ' + match[1])
			
			//Next match
			match = exp.exec(newText)
		}
		*/
	}
	
	//Check whether private decorator given
	if (this.query.privateDecorator){
		
		//Check whether public already being used
		if (newText.indexOf('Private') < 0){
			newText = 'import { Private } from \'' + this.query.privateDecorator + '\'\n' + newText
		}
		
		//Add decorator to public
		newText = newText.replace(/\sprivate\s(?!constructor)/gm, ' @Private private ')
		newText = newText.replace(/constructor\(private\s/gm, 'constructor(@Private private ')
		newText = newText.replace(/,private\s/gm, ',@Private private ')
		
		//Loop through and replace public access
		/*
		exp = /(?:\s|constructor\(|,)(private)\s/gm///[^}]*\s(private)\s[^}]*\s*\([^}]*\)\s*{[^}]*}/gm
		match = exp.exec(newText)
		while (match != null) {
			
			//Replace public
			newText = newText.substr(0, match.index) + newText.substr(match.index).replace(match[1], '@Private ' + match[1])
			
			//Next match
			match = exp.exec(newText)
		}
		*/
	}
	
	//Check whether public decorator given
	if (this.query.protectedDecorator){
		
		//Check whether public already being used
		if (newText.indexOf('Protected') < 0){
			newText = 'import { Protected } from \'' + this.query.protectedDecorator + '\'\n' + newText
		}
		
		//Add decorator to public
		newText = newText.replace(/\sprotected\s(?!constructor)/gm, ' @Protected protected ')
		newText = newText.replace(/constructor\(protected\s/gm, 'constructor(@Protected protected ')
		newText = newText.replace(/,protected\s/gm, ',@Protected protected ')
		
		//Loop through and replace public access
		/*
		exp = /(?:\s|constructor\(|,)(protected)\s/gm///[^}]*\s(protected)\s[^}]*\s*\([^}]*\)\s*{[^}]*}/gm
		match = exp.exec(newText)
		while (match != null) {
			
			//Replace public
			newText = newText.substr(0, match.index) + newText.substr(match.index).replace(match[1], '@Protected ' + match[1])
			
			//Next match
			match = exp.exec(newText)
		}
		*/
	}
	
	return newText
}

namespace loader {
    export const TSDeclerationsPlugin = DeclerationsPlugin
}

export = loader