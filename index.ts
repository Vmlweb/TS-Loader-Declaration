import * as path from 'path'

export class TSDeclerationsPlugin{
	
	out: string
	module: string

	constructor(options: any = {}){
		this.out = options.out || './bundle.d.ts'
		this.module = options.module

		if (!options.module){
			throw new Error('Please specify a module name')
		}
	}

	apply(compiler){
		
		//when the compiler is ready to emit files
		compiler.plugin('emit', (compilation, done) => {
			
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
			for (const line of seperateDecls[entry].split('\n')){
						
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
				for (const segment of seperateDecls[name].split(/export /gm)){
					
					//Loop through each line of segment
					let match
					for (const line of segment.split('\n')){
						
						//Exclude if empty or import
						if (line.length <= 0 || line.startsWith('import ') || line.startsWith('//')){
							continue
						}
						
						//Extract type identifier
						/*const type = /.*:\s?(.*)/g.exec(line)
						if (type && type.length >= 1){
							if ()
							break
						}*/
						
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
		})
	}
}