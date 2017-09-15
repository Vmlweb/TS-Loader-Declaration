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
            let externals: { [key: string]: string[] } = {}
            
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
					let tempExports = []
		            let importing = false
		            let exporting = false
		            let exportingFile = false
		            let exportingAll = false
		            let filename = false
		            let start = 0
		            let offset = 1
		            let first = false
					
					//Loop through each token in module
					const tokens = esprima.tokenize("'" + module, { range: true })
					for (let i = 0; i < tokens.length; i++){
						const token = tokens[i]
                        const nextToken = tokens.length >= i + 1 ? tokens[i + 1] : undefined
					
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
							
							//Merge or leave value if star
							const name = token.value.replace(/\'/g, '')
							if (imports[name] === undefined){
								imports[name] = []
							}
							if (imports[name].indexOf('*') <= -1){
								imports[name] = imports[name].concat(tempImports)
							}
							
							//Replace with whitespace
							module = this.replace(start - offset, token.range[1] - (offset - 1), module)
							offset += 1
						}
			
						//Exporting wildcard found
                        if (exporting && token.type === 'Punctuator' && token.value === '*'){
	                        exportingAll = true
						}
						
						//Stop exporting type found
						if (exporting && token.type === 'Keyword'){
							exporting = false
						}
						
						//Start exporting
						if (token.type === 'Keyword' && token.value === 'export'){
							exporting = true
							tempExports = []
							start = token.range[0]
						}
			
						//Append export
						if (exporting && !exportingAll && token.type === 'Identifier'){
							exports.push(token.value)
							tempExports.push(token.value)
						}
						
						//Stop exporting
						if (exporting && token.type === 'Punctuator' && token.value === '}'){
							exporting = false
							
							//Check whether export ended
                            if (nextToken && nextToken.type === 'Identifier' && nextToken.value === 'from'){
	                            exportingFile = true
	                        }else{
							
								//Replace with whitespace
								module = this.replace(start - offset, token.range[1] - (offset - 1), module)
								offset += 1
							}
						}
						
						//Stop exporting file
						if ((exportingFile || exportingAll) && token.type === 'String'){
	                        
							//Merge or leave value if star
							const name = token.value.replace(/\'/g, '')
							if (imports[name] === undefined){
								imports[name] = []
							}
							if (exportingAll){
								imports[name] = [ '*' ]
							}else if (imports[name].indexOf('*') <= -1){
								imports[name] = imports[name].concat(tempExports)
							}
	                        
	                        //Reset vars
	                        exportingFile = false
	                        exportingAll = false
	                        
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
				
				//Loop through and extract external exports
				let tempImports = []
				let importing = false
				let filename = true
				for (const token of esprima.tokenize("'" + module)){
					
					//Start importing
					if (token.type === 'Keyword' && token.value === 'import'){
						importing = true
						tempImports = []
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
						
						//Add imports to externals
						const name = token.value.replace(/\'/g, '')
						
						//Check whether internal or external
						if (name.startsWith('Module/')){

							//Add to imports
							if (imports[name].indexOf('*') <= -1){
								imports[name] = tempImports			
							}			
							
						}else{
						
							//Create externals category
							if (!externals.hasOwnProperty(name)){
								externals[name] = []
							}
							
							//Add imports to externals category if not existing
							for (const imprt of tempImports){
								if (externals[name].indexOf(imprt) <= -1){
									externals[name].push(imprt)
								}
							}
						}
					}
				}
				
				//Find each import to include
				for (const imprt of imports[name]){
				
					//Prepare temp variables
					let end = 0
					let count = 0
					let first = false
					let type = false
					let submodule
					
					//Export entire module
					if (imprt === '*'){
						
						//Find range of exports to extract and remove imports
						submodule = ''
						for (const line of module.substring(module.indexOf('{') + 1).split('\n')){
							if (line.trim().substring(0, 6) !== 'import'){
								submodule += line + '\n'
							}
						}
						end = submodule.lastIndexOf('}')
					}
					
					//Check for start position of const
					const checkConst = new RegExp('export(\\s|\\s.*\\s)(const|let|var|function)\\s' + imprt + '(|\\s|\\s.*\\s)({|:)').exec(module)
					if (imprt !== '*' && checkConst){
						
						//Find range of import to extract
						submodule = module.substring(checkConst.index)
						end = submodule.indexOf('\n')
					}
					
					//Check for start position of import
					const checkBraces = new RegExp('export(\\s|\\s.*\\s)(class|interface|enum)\\s' + imprt + '(|\\s|\\s.*\\s)({|:)').exec(module)
					if (imprt !== '*' && checkBraces){
						
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
			
			console.log(imports)
			console.log(exports)
				
			//Remove externals which are not in use
			Object.keys(externals).forEach(name => {
				externals[name] = externals[name].filter(item => newBundle.indexOf(item) > -1)
				
				//Remove if empty
				if (externals[name].length <= 0){
					delete externals[name]
				}
			})
			
			//Prepare externals header
			let header = ''
			Object.keys(externals).forEach(name => {
				header += 'import { ' + externals[name].join(', ') + ' } from "' + name + '" \n'
			})
			newBundle = header + newBundle
			
	        //Write new bundle to file
	        fs.writeFileSync(out, beautify(newBundle.replace(/^ +/gm, '').replace(/\n\n/gm, ''), { indent_size: 1, indent_with_tabs: true }))
		})
	}
	
	replace(start, end, what) {
	    return what.substring(0, start) + Array(end-start).join(' ') + what.substring(end)
	}
}