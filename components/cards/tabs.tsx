import React from 'react'

const Tabs = ({filePath, isActive, setSelectedTabPath, setSeletedPath, index, handleRemoveTab}:any) => {
    const fileName=filePath.split('/').pop()
    const iconMapping: { [key: string]: string }= {
      js: 'devicon-javascript-plain colored',
      py: 'devicon-python-plain colored',
      java: 'devicon-java-plain colored',
      html: 'devicon-html5-plain colored',
      css: 'devicon-css3-plain colored',
      json: 'devicon-json-plain colored',
      jsx: 'devicon-react-plain colored',
      ts: 'devicon-typescript-plain colored',
      tsx: 'devicon-react-plain colored',
      md: 'devicon-markdown-plain colored',
      php: 'devicon-php-plain colored',
      sql: 'devicon-mysql-plain colored',
      ruby: 'devicon-ruby-plain colored',
      go: 'devicon-go-plain colored',
      c: 'devicon-c-plain colored',
      cpp: 'devicon-cplusplus-plain colored',
      abap: 'devicon-devicon-plain colored', 
      abc: 'devicon-devicon-plain colored', 
      actionscript: 'devicon-devicon-plain colored', 
      ada: 'devicon-devicon-plain colored', 
      alda: 'devicon-devicon-plain colored', 
      apache_conf: 'devicon-apache-plain colored',
      apex: 'devicon-devicon-plain colored', 
      applescript: 'devicon-apple-plain colored',
      aql: 'devicon-devicon-plain colored', 
      asciidoc: 'devicon-devicon-plain colored', 
      asl: 'devicon-devicon-plain colored', 
      assembly_arm32: 'devicon-devicon-plain colored', 
      assembly_x86: 'devicon-devicon-plain colored', 
      astro: 'devicon-devicon-plain colored', 
      autohotkey: 'devicon-devicon-plain colored', 
      batchfile: 'devicon-windows8-original',
      bibtex: 'devicon-devicon-plain colored', 
      c9search: 'devicon-devicon-plain colored', 
      c_cpp: 'devicon-cplusplus-plain colored',
      cirru: 'devicon-devicon-plain colored', 
      clojure: 'devicon-clojure-plain colored',
      cobol: 'devicon-devicon-plain colored', 
      coffee: 'devicon-coffeescript-plain colored',
      coldfusion: 'devicon-devicon-plain colored', 
      crystal: 'devicon-devicon-plain colored', 
      csharp: 'devicon-csharp-plain colored',
      csound_document: 'devicon-devicon-plain colored', 
      csound_orchestra: 'devicon-devicon-plain colored', 
      csound_score: 'devicon-devicon-plain colored', 
      csp: 'devicon-devicon-plain colored', 
      curly: 'devicon-devicon-plain colored', 
      cuttlefish: 'devicon-devicon-plain colored', 
      d: 'devicon-d-plain colored',
      dart: 'devicon-dart-plain colored',
      diff: 'devicon-devicon-plain colored', 
      django: 'devicon-django-plain colored',
      dockerfile: 'devicon-docker-plain colored',
      dot: 'devicon-graphviz-plain colored',
      drools: 'devicon-devicon-plain colored', 
      edifact: 'devicon-devicon-plain colored', 
      eiffel: 'devicon-devicon-plain colored', 
      ejs: 'devicon-devicon-plain colored', 
      elixir: 'devicon-elixir-plain colored',
      elm: 'devicon-elm-plain colored',
      erlang: 'devicon-erlang-plain colored',
      flix: 'devicon-devicon-plain colored', 
      forth: 'devicon-devicon-plain colored', 
      fortran: 'devicon-devicon-plain colored', 
      fsharp: 'devicon-fsharp-plain colored',
      fsl: 'devicon-devicon-plain colored', 
      ftl: 'devicon-devicon-plain colored', 
      gcode: 'devicon-devicon-plain colored', 
      gherkin: 'devicon-devicon-plain colored', 
      gitignore: 'devicon-git-plain colored',
      glsl: 'devicon-devicon-plain colored', 
      gobstones: 'devicon-devicon-plain colored', 
      graphqlschema: 'devicon-graphql-plain colored',
      groovy: 'devicon-groovy-plain colored',
      haml: 'devicon-devicon-plain colored', 
      handlebars: 'devicon-handlebars-plain colored',
      haskell: 'devicon-haskell-plain colored',
      haskell_cabal: 'devicon-devicon-plain colored', 
      haxe: 'devicon-devicon-plain colored', 
      hjson: 'devicon-devicon-plain colored', 
      html_elixir: 'devicon-html5-plain colored',
      html_ruby: 'devicon-html5-plain colored',
      ini: 'devicon-devicon-plain colored', 
      io: 'devicon-devicon-plain colored', 
      ion: 'devicon-devicon-plain colored', 
      jack: 'devicon-devicon-plain colored', 
      jade: 'devicon-devicon-plain colored', 
      jexl: 'devicon-devicon-plain colored', 
      json5: 'devicon-json-plain colored',
      jsoniq: 'devicon-devicon-plain colored', 
      jsp: 'devicon-devicon-plain colored', 
      jssm: 'devicon-devicon-plain colored', 
      julia: 'devicon-julia-plain colored',
      kotlin: 'devicon-kotlin-plain colored',
      latex: 'devicon-latex-plain colored',
      latte: 'devicon-devicon-plain colored', 
      less: 'devicon-less-plain colored-wordmark',
      liquid: 'devicon-devicon-plain colored', 
      lisp: 'devicon-devicon-plain colored', 
      livescript: 'devicon-devicon-plain colored', 
      logiql: 'devicon-devicon-plain colored', 
      logtalk: 'devicon-devicon-plain colored', 
      lsl: 'devicon-devicon-plain colored', 
      lua: 'devicon-lua-plain colored',
      luapage: 'devicon-devicon-plain colored', 
      lucene: 'devicon-devicon-plain colored', 
      makefile: 'devicon-devicon-plain colored', 
      mask: 'devicon-devicon-plain colored', 
      matlab: 'devicon-matlab-plain colored',
      maze: 'devicon-devicon-plain colored', 
      mediawiki: 'devicon-devicon-plain colored', 
      mel: 'devicon-devicon-plain colored', 
      mips: 'devicon-devicon-plain colored', 
      mixal: 'devicon-devicon-plain colored', 
      mushcode: 'devicon-devicon-plain colored', 
      mysql: 'devicon-mysql-plain colored',
      nasal: 'devicon-devicon-plain colored', 
      nginx: 'devicon-nginx-plain colored',
      nim: 'devicon-devicon-plain colored', 
      nix: 'devicon-devicon-plain colored', 
      nsis: 'devicon-devicon-plain colored', 
      nunjucks: 'devicon-devicon-plain colored', 
      objectivec: 'devicon-objectivec-plain colored',
      ocaml: 'devicon-ocaml-plain colored',
      odin: 'devicon-devicon-plain colored', 
      partiql: 'devicon-devicon-plain colored', 
      pascal: 'devicon-devicon-plain colored', 
      perl: 'devicon-perl-plain colored',
      pgsql: 'devicon-postgresql-plain colored',
      php_laravel_blade: 'devicon-laravel-plain colored',
      pig: 'devicon-devicon-plain colored', 
      plain_text: 'devicon-devicon-plain colored', 
      txt: 'devicon-devicon-plain colored', 
      plsql: 'devicon-devicon-plain colored', 
      powershell: 'devicon-devicon-plain colored', 
      praat: 'devicon-devicon-plain colored', 
      prisma: 'devicon-devicon-plain colored', 
      prolog: 'devicon-devicon-plain colored', 
      properties: 'devicon-devicon-plain colored', 
      protobuf: 'devicon-devicon-plain colored', 
      prql: 'devicon-devicon-plain colored', 
      puppet: 'devicon-puppet-plain colored',
      qml: 'devicon-devicon-plain colored', 
      r: 'devicon-r-plain colored',
      raku: 'devicon-devicon-plain colored', 
      razor: 'devicon-devicon-plain colored', 
      rdoc: 'devicon-devicon-plain colored', 
      red: 'devicon-devicon-plain colored', 
      redshift: 'devicon-devicon-plain colored', 
      rhtml: 'devicon-devicon-plain colored', 
      robot: 'devicon-devicon-plain colored', 
      rst: 'devicon-devicon-plain colored', 
      rust: 'devicon-rust-plain colored',
      sac: 'devicon-devicon-plain colored', 
      sass: 'devicon-sass-plain colored',
      scad: 'devicon-devicon-plain colored', 
      scala: 'devicon-scala-plain colored',
      scheme: 'devicon-devicon-plain colored', 
      scrypt: 'devicon-devicon-plain colored', 
      scss: 'devicon-sass-original',
      sh: 'devicon-linux-plain colored',
      sjs: 'devicon-devicon-plain colored', 
      slim: 'devicon-devicon-plain colored', 
      smarty: 'devicon-devicon-plain colored', 
      smithy: 'devicon-devicon-plain colored', 
      snippets: 'devicon-devicon-plain colored', 
      soy_template: 'devicon-devicon-plain colored', 
      space: 'devicon-devicon-plain colored', 
      sparql: 'devicon-devicon-plain colored', 
      sqlserver: 'devicon-microsoftsqlserver-plain colored',
      stylus: 'devicon-stylus-plain colored',
      svg: 'devicon-devicon-plain colored', 
      swift: 'devicon-swift-plain colored',
      tcl: 'devicon-devicon-plain colored', 
      terraform: 'devicon-devicon-plain colored', 
      tex: 'devicon-devicon-plain colored', 
      text: 'devicon-devicon-plain colored', 
      textile: 'devicon-devicon-plain colored', 
      toml: 'devicon-devicon-plain colored', 
      turtle: 'devicon-devicon-plain colored', 
      twig: 'devicon-devicon-plain colored', 
      vala: 'devicon-devicon-plain colored', 
      vbscript: 'devicon-devicon-plain colored', 
      velocity: 'devicon-devicon-plain colored', 
      verilog: 'devicon-devicon-plain colored', 
      vhdl: 'devicon-devicon-plain colored', 
      visualforce: 'devicon-devicon-plain colored', 
      vue: 'devicon-vuejs-plain colored',
      wollok: 'devicon-devicon-plain colored', 
      xml: 'devicon-devicon-plain colored', 
      xquery: 'devicon-devicon-plain colored', 
      yaml: 'devicon-devicon-plain colored', 
      zeek: 'devicon-devicon-plain colored', 
      zig: 'devicon-devicon-plain colored', 
    };
  return (
    <div className={` w-full editor-tab ${isActive?'editor-tab-active':''} px-6 py-[6px] cursor-pointer text-small-regular flex justify-between items-center`} onClick={()=>{setSelectedTabPath(filePath); setSeletedPath(filePath)}}>
      <div className="flex justify-between items-center gap-2">
        <i className={iconMapping[fileName.split(".").pop() as string]}></i>  {fileName}
      </div>
      <div className="hover:bg-white-2 rounded-full hover:text-black-1 px-[6px] cursor-pointer" onClick={()=>handleRemoveTab(index)}>×</div>
    </div>
  )
}

export default Tabs
