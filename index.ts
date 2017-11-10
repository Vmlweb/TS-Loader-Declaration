import { DeclerationsPlugin } from './plugin'

function loader(text){
	
	//Loop through each line in file
	let newText = text.split('\n')
	for (let i = 0; i < newText.length; i++){
		
		//Check whether line is importing
		if (newText[i].startsWith('import {')){
			const file = /from\s(?:\'|\")(\.{1,2}\/.*)(?:\'|\")$/gm.exec(newText[i])
			if (file){
			
				//Add import to end to include
				newText.push('import \'' + file[1] + '\' //<TSLoaderDecleration>')
			}
		}
	}
	return newText.join('\n')
}

namespace loader {
    export const TSDeclerationsPlugin = DeclerationsPlugin
}

export = loader