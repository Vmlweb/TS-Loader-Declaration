import * as path from 'path'
import * as fs from 'fs'
import * as dts from 'dts-bundle'
import * as esprima from 'esprima'
import * as beautify from 'js-beautify'

export class TSDeclerationsPlugin{
	
	out: string
	
	constructor(options: any = {}){
		this.out = options.out || './bundle.d.ts'
	}
	
	apply(compiler){
	
		//Wait for compiler to emit files
		compiler.plugin('done', (stats) => {
			
			//Create shared bundle and remove old source files
			const out = path.join(stats.compilation.options.output.path, this.out)
			dts.bundle({
                name: 'Module',
                out: out,
                main: path.join(stats.compilation.options.output.path, stats.compilation.options.entry.replace('.ts', '.d.ts')),
                removeSource: true
            })
            
            //Remove source directory
            //rimraf.sync(path.join(stats.compilation.options.output.path, path.dirname(stats.compilation.options.entry)))
            
            //Read decleration bundle from file
            const bundle = fs.readFileSync(out).toString()
            let newBundle = ''
            
            //Prepare working variables
            let imports = {}
            let exports = []
            
			//Loop through each trimmed module
			const subBundles = bundle.split('declare module \'')
			subBundles.shift()
			for (let segment of subBundles){
				let module = segment.trim()
				const name = module.substring(0, module.indexOf("'"))
				
				//Check whether module is entry
				if (name === 'Module'){
			
					//Prepare temp variables
					let tempImports = []
		            let importing = false
		            let exporting = false
		            let filename = false
		            let literal = false
		            let start = 0
		            let offset = 1
		            let first = false
					
					//Loop through each token in module
					for (const token of esprima.tokenize("'" + module, { range: true })){
					
						//Start importing
						if (token.type === 'Keyword' && token.value === 'import'){
							importing = true
							tempImports = []
							start = token.range[0]
						}
						
						//Append import
						if (importing && token.type === 'Identifier' && token.value !== 'from'){
							tempImports.push(token.value)
						}
						
						//Look for import filename
						if (importing && token.value === 'from'){
							filename = true
						}
						if (importing && filename && token.type === 'String'){
							importing = false
							filename = false
							imports[token.value.replace(/\'/g, '')] = tempImports
							
							//Replace with whitespace
							module = this.replace(start - offset, token.range[1] - (offset - 1), module)
							offset += 1
						}
			
						//Stop exporting type found
						if (exporting && token.type === 'Keyword'){
							exporting = false
						}
						
						//Start exporting
						if (token.type === 'Keyword' && token.value === 'export'){
							exporting = true
							start = token.range[0]
						}
						
						//Export literally
						/*if (exporting && token.type === 'Keyword') {
							literal = true
                        }
                        if (exporting && literal && token.type === 'Identifier'){
							exports.push(token.value)
							literal = false
							exporting = false
							
							//Replace with whitespace
							module = this.replace(start, token.range[1], module)
						}*/
			
						//Append export
						if (exporting && token.type === 'Identifier'){
							exports.push(token.value)
						}
			
						//Stop exporting
						if (exporting && token.type === 'Punctuator' && token.value === '}'){
							exporting = false
							
							//Replace with whitespace
							module = this.replace(start - offset, token.range[1] - (offset - 1), module)
							offset += 1
						}
					}
					
					//Remove module wrapper and add to buffer
					module = this.replace(0, module.indexOf('{')+1, module)
					module = this.replace(module.lastIndexOf('}'), module.length, module)
					newBundle += module
				}
				
				//Check whether name exists in imports
				if (!imports.hasOwnProperty(name)){
					continue
				}
				
				//Find each import to include
				for (const imprt of imports[name]){
				
					//Prepare temp variables
					let end = 0
					let count = 0
					let first = false
					let type = false
					let submodule
					
					//Check for start position of const
					const checkConst = new RegExp('export(\\s|\\s.*\\s)(const|let|var|function)\\s' + imprt + '(|\\s|\\s.*\\s)({|:)').exec(module)
					if (checkConst){
						
						//Find range of import to extract
						submodule = module.substring(checkConst.index)
						end = submodule.indexOf('\n')
					}
					
					//Check for start position of import
					const checkBraces = new RegExp('export(\\s|\\s.*\\s)(class|interface|enum)\\s' + imprt + '(|\\s|\\s.*\\s)({|:)').exec(module)
					if (checkBraces){
						
						//Find range of import to extract
						submodule = module.substring(checkBraces.index)
						for (const token of esprima.tokenize(submodule, { range: true })){
							if (token.type === 'Punctuator' && token.value === '{'){
								count += 1
								first = true
							}
							if (token.type === 'Punctuator' && token.value === '}'){
								count -= 1
							}
							if (token.type === 'Punctuator' && token.value === '}' && count === 0 && first){
								end = token.range[1]
								break
							}
						}
					}
					
					//Extract and dump in new bundle
					if (submodule){
						newBundle += submodule.substring(0, end) + '\n'
					}
				}
			}
			
	        //Write new bundle to file
	        fs.writeFileSync(out, beautify(newBundle.replace(/^ +/gm, ''), { indent_size: 1, indent_with_tabs: true }))
		})
	}
	
	replace(start, end, what) {
	    return what.substring(0, start) + Array(end-start).join(' ') + what.substring(end)
	}
}