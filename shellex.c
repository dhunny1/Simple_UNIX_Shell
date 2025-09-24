/* $begin shellmain */
#include "csapp.h"
#define MAXARGS   128
#define Max_Val 4096

/* Function prototypes */
void eval(char *cmdline);
int parseline(char *buf, char **argv);
int builtin_command(char **argv); 
//printfunction
void printpid();
void printppid();


void printpid(){
    printf("%d\n",getpid());
}
void printppid(){
    printf("%d\n",getppid());
}
int main(int argc, char *argv[]) 
{
    //disables ctrl+c or ^c
    if (signal(SIGINT,SIG_IGN)==SIG_ERR){
        unix_error("SIGNAL ERROR!!");
    }
    char cmdline[MAXLINE]; /* Command line */

    while (1) {
	/* Read */
	printf("> "); 
    if(argc>1){
        if(strstr(argv[1],"-p")!=NULL){
            printf("%s>",argv[2]);
        }
    }else{
        printf("sh257>");
    }             
	Fgets(cmdline, MAXLINE, stdin); 
	if (feof(stdin))
	    exit(0);

	/* Evaluate */
	eval(cmdline);
    } 
}
/* $end shellmain */
  
/* $begin eval */
/* eval - Evaluate a command line */
void eval(char *cmdline) 
{
    char *argv[MAXARGS]; /* Argument list execve() */
    char buf[MAXLINE];   /* Holds modified command line */
    int bg;              /* Should the job run in bg or fg? */
    pid_t pid;           /* Process id */
    
    strcpy(buf, cmdline);
    bg = parseline(buf, argv); 
    if (argv[0] == NULL)  
	return;   /* Ignore empty lines */

    if (!builtin_command(argv)) { 
        if ((pid = Fork()) == 0) {   /* Child runs user job */
            if (execvp(argv[0], argv) < 0) {
                printf("%s: Command not found.\n", argv[0]);
                exit(0);
            }
        }

	/* Parent waits for foreground job to terminate */
	if (!bg) {
	    int status;
	    if (waitpid(pid, &status, 0) < 0)
		unix_error("waitfg: waitpid error");
	}
	else
	    printf("%d %s", pid, cmdline);
    }
    return;
}

/* If first arg is a builtin command, run it and return true */
int builtin_command(char **argv) 
{   
    //gets process ID
    if (!strcmp(argv[0], "pid")){
        printpid();
        return 1;
    }
    //gets parent process ID
    if (!strcmp(argv[0], "ppid")){
        printppid();
        return 1;
    }

    //changes directory
    if (!strcmp(argv[0], "cd")){
        char cwd[Max_Val];
        getcwd(cwd,sizeof(cwd));

        //checks if the Directory names exists
        if(argv[1]!= NULL){
            int update_status = chdir(argv[1]);
            if(update_status==0){
                return 1;
            }else if(update_status !=0){
                printf("Directory Not Found");
                return 0;
            }
        }
        else{
            if(cwd!=NULL){
                printf("Current Directory: %s \n", cwd);
                return 1;
            }else{
                printf("path not found");
            }

        }
        return 1;
        
        
    }

    if (!strcmp(argv[0],"help")){
        printf("**********************************************************************\n");
		printf("A Custom Shell for CMSC257\n");
        printf("    Developer: Hunny Biguvu\n");
		printf("Usage: \n");
		printf("    ./sh257 -p (name) -- to change prompt \n ");
		printf("**********************************************************************\n");
		printf("BUILTIN COMMANDS:\n");
        printf("    pid -- to get process ID \n");
        printf("    ppid -- to get Prent process ID \n");
        printf("    help -- to get description of all commands \n");
        printf("    cd -- gets get to the home Directory \n");
        printf("    cd .. -- to go back one directory\n");
        printf("    cd <directory> -- to go into the directory \n");
        printf("    exit -- to exit the shell \n");
        printf("*********************************************************************\n");
        printf("SYSYTEM COMMANDS:\n");
        printf("    man -- on-line reference manuals \n");
        return 1;

    }

    //to exit 
    if(!strcmp(argv[0],"exit")){
        raise(SIGTERM);
    }

    if (!strcmp(argv[0], "quit")) /* quit command */
	exit(0);  
    if (!strcmp(argv[0], "&"))    /* Ignore singleton & */
	return 1;
    return 0;                     /* Not a builtin command */
}
/* $end eval */

/* $begin parseline */
/* parseline - Parse the command line and build the argv array */
int parseline(char *buf, char **argv) 
{
    char *delim;         /* Points to first space delimiter */
    int argc;            /* Number of args */
    int bg;              /* Background job? */

    buf[strlen(buf)-1] = ' ';  /* Replace trailing '\n' with space */
    while (*buf && (*buf == ' ')) /* Ignore leading spaces */
	buf++;

    /* Build the argv list */
    argc = 0;
    while ((delim = strchr(buf, ' '))) {
	argv[argc++] = buf;
	*delim = '\0';
	buf = delim + 1;
	while (*buf && (*buf == ' ')) /* Ignore spaces */
            buf++;
    }
    argv[argc] = NULL;
    
    if (argc == 0)  /* Ignore blank line */
	return 1;

    /* Should the job run in the background? */
    if ((bg = (*argv[argc-1] == '&')) != 0)
	argv[--argc] = NULL;

    return bg;
}
/* $end parseline */


