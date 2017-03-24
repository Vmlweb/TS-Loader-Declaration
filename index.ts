import * as path from 'path'
import * as rimraf from 'rimraf'
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
            rimraf.sync(path.join(stats.compilation.options.output.path, path.dirname(stats.compilation.options.entry)))
            
            //Read decleration bundle from file
            const bundle = fs.readFileSync(out).toString()
            let newBundle = ''
            
            //Prepare working variables
            let imports = {}
            let exports = []
            
			//Loop through each line
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
		
		//OLD STATIC ANALYSER
		//when the compiler is ready to emit files
		/*compiler.plugin('emit', (compilation, done) => {
			
			//Remove all decleration files from emission and store locally
			const entry = compilation.options.entry.replace('./', '').replace('.ts', '.d.ts')
			const seperateDecls = {}
			let combinedDecls = ''
			for (const filename in compilation.assets){
				
				//Check file type and remove
				if(filename.indexOf('.d.ts') !== -1){
					seperateDecls[filename] = compilation.assets[filename].source()
					delete compilation.assets[filename]
				}
			}
			
			//Declare temp vars
			const imports = []
			const exports = []
			
			//Loop through entry file
			for (const spaceLine of seperateDecls[entry].split('\n')){
				const line = spaceLine.trim()
				
				//Parse import
				if (line.startsWith('import ')){
					
					//Extract values
					const file = /from\s\'(.*?)\';?$/g.exec(line)[1]
					for (const match of /{\s(.*?)\s}/g.exec(line)[1].replace(/ /g, '').split(',')){
						imports.push(match + '_from_' + path.join(path.dirname(entry), file) + '.d.ts')
					}
				}
				
				//Parse export
				if (line.startsWith('export ')){
					
					//Extract values
					for (const match of /{\s(.*?)\s}/g.exec(line)[1].replace(/ /g, '').split(',')){
						exports.push(match)
					}
				}
			}
			
			//Loop through each decleration file
			Object.keys(seperateDecls).forEach(name => {
				
				//Extract content from other files 
				for (const segment of seperateDecls[name].split(/^(export|class|interface|declare|enum) /gm)){
					
					//Loop through each line of segment
					let match
					for (const line of segment.split('\n')){
						
						//Exclude if empty or import
						if (line.length <= 0 || line.startsWith('import ') || line.startsWith('//')){
							continue
						}
						
						//Extract type identifier
						const type = /.*:\s?(.*)/g.exec(line)
						if (type && type.length >= 1){
							if ()
							break
						}
						
						//Extract name from export
						match = /(\S*?)\s?{/g.exec(line)
						if (match && match.length >= 1){
							match = match[1]
							break
						}
					}
					
					//Check whether name has been import and exported and exclude if nesisary
					if (match && match.length >= 1 && imports.indexOf(match + '_from_' + name) > -1 && exports.indexOf(match) > -1){
					
						//Append modified file to combined decleration
						const lines = segment.split('\n')
						combinedDecls += 'export ' + lines.pop()
						combinedDecls += lines.filter(line => {
							const trimmed = line.trim()
							return !trimmed.startsWith('import') && !trimmed.startsWith('//') && !trimmed.startsWith('private')
						}).join('\n') + '\n'
					}
				}
			})
			
			//Wrap in typescript module
			//combinedDecls = 'declare namespace ' + this.module + '{\n' + combinedDecls + '}'

			//Add combined decleration file to emission
			compilation.assets[this.out] = {
				source: function() { return combinedDecls },
				size: function() { return combinedDecls.length }
			}

			done()
		})*/
	}
	
	replace(start, end, what) {
	    return what.substring(0, start) + Array(end-start).join(' ') + what.substring(end)
	}
}